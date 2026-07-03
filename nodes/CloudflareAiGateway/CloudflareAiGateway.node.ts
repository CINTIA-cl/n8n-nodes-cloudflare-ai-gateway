import { ChatOpenAI, type ClientOptions } from '@langchain/openai';
import {
	NodeConnectionTypes,
	type INodeType,
	type INodeTypeDescription,
	type ILoadOptionsFunctions,
	type INodeListSearchResult,
	type ISupplyDataFunctions,
	type SupplyData,
} from 'n8n-workflow';

const CF_API = 'https://api.cloudflare.com/client/v4';

interface CfCredentials {
	accountId: string;
	gatewayId: string;
	apiKey: string;
}

// ponytail: no @n8n/ai-utilities (N8nLlmTracing / getProxyAgent / failedAttemptHandler) to avoid
// coupling to n8n-internal packages. The model still works fully with Agent/Chain nodes. Add later
// if detailed per-LLM-call tracing spans or corporate-proxy support are needed.

export class CloudflareAiGateway implements INodeType {
	methods = {
		listSearch: {
			async searchModels(
				this: ILoadOptionsFunctions,
				filter?: string,
			): Promise<INodeListSearchResult> {
				const { accountId, apiKey } = (await this.getCredentials(
					'cloudflareAiGatewayApi',
				)) as CfCredentials;

				// Manual bearer is intentional here: httpRequestWithAuthentication's `this`
				// type is not assignable in ILoadOptionsFunctions, and a static token is
				// sufficient for a read-only model-list fetch.
				// eslint-disable-next-line @n8n/community-nodes/no-http-request-with-manual-auth
				const res = (await this.helpers.httpRequest({
					method: 'GET',
					url: `${CF_API}/accounts/${accountId}/ai/models/search`,
					headers: { Authorization: `Bearer ${apiKey}` },
					json: true,
				})) as { result?: Array<{ name: string; task?: { name?: string } }> };

				const results = (res.result ?? [])
					.filter((m) => m.task?.name === 'Text Generation')
					.filter((m) => !filter || m.name.toLowerCase().includes(filter.toLowerCase()))
					.sort((a, b) => a.name.localeCompare(b.name))
					.map((m) => ({ name: m.name, value: m.name }));

				return { results };
			},
		},
	};

	description: INodeTypeDescription = {
		displayName: 'Cloudflare AI Gateway',
		name: 'cloudflareAiGateway',
		icon: { light: 'file:cloudflare.svg', dark: 'file:cloudflare.dark.svg' },
		group: ['transform'],
		version: 1,
		description: 'Language Model via Cloudflare AI Gateway (Workers AI + third-party providers)',
		defaults: { name: 'Cloudflare AI Gateway' },
		subtitle: '={{$parameter.model.value || $parameter.model}}',
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Language Models', 'Root Nodes'],
				'Language Models': ['Chat Models (Recommended)'],
			},
		},
		inputs: [],
		outputs: [NodeConnectionTypes.AiLanguageModel],
		outputNames: ['Model'],
		credentials: [{ name: 'cloudflareAiGatewayApi', required: true }],
		properties: [
			{
				displayName: 'Model',
				name: 'model',
				type: 'resourceLocator',
				description:
					'Workers AI (@cf) from list, or any provider/model as ID (e.g. openai/gpt-4.1)',
				default: { mode: 'list', value: '@cf/meta/llama-3.3-70b-instruct-fp8-fast' },
				required: true,
				modes: [
					{
						displayName: 'From List',
						name: 'list',
						type: 'list',
						placeholder: 'Select a model...',
						typeOptions: { searchListMethod: 'searchModels', searchable: true },
					},
					{
						displayName: 'ID',
						name: 'id',
						type: 'string',
						placeholder: '@cf/meta/llama-3.3-70b-instruct-fp8-fast  or  openai/gpt-4.1',
					},
				],
			},
			{
				displayName: 'Options',
				name: 'options',
				placeholder: 'Add Option',
				type: 'collection',
				default: {},
				options: [
					{
						displayName: 'Frequency Penalty',
						name: 'frequencyPenalty',
						default: 0,
						typeOptions: { maxValue: 2, minValue: -2, numberPrecision: 1 },
						type: 'number',
					},
					{
						displayName: 'Max Retries',
						name: 'maxRetries',
						default: 2,
						type: 'number',
					},
					{
						displayName: 'Maximum Number of Tokens',
						name: 'maxTokens',
						default: -1,
						type: 'number',
					},
					{
						displayName: 'Presence Penalty',
						name: 'presencePenalty',
						default: 0,
						typeOptions: { maxValue: 2, minValue: -2, numberPrecision: 1 },
						type: 'number',
					},
					{
						displayName: 'Sampling Temperature',
						name: 'temperature',
						default: 0.7,
						typeOptions: { maxValue: 2, minValue: 0, numberPrecision: 1 },
						type: 'number',
					},
					{
						displayName: 'Timeout',
						name: 'timeout',
						default: 60000,
						type: 'number',
					},
					{
						displayName: 'Top P',
						name: 'topP',
						default: 1,
						typeOptions: { maxValue: 1, minValue: 0, numberPrecision: 1 },
						type: 'number',
					},
				],
			},
		],
	};

	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		const { accountId, gatewayId, apiKey } = (await this.getCredentials(
			'cloudflareAiGatewayApi',
		)) as CfCredentials;

		const modelName = this.getNodeParameter('model.value', itemIndex) as string;
		const options = this.getNodeParameter('options', itemIndex, {}) as {
			temperature?: number;
			maxTokens?: number;
			topP?: number;
			frequencyPenalty?: number;
			presencePenalty?: number;
			timeout?: number;
			maxRetries?: number;
		};

		const configuration: ClientOptions = {
			baseURL: `${CF_API}/accounts/${accountId}/ai/v1`,
			defaultHeaders: {
				'cf-aig-gateway-id': gatewayId || 'default',
			},
		};

		const model = new ChatOpenAI({
			apiKey,
			model: modelName,
			temperature: options.temperature,
			maxTokens: options.maxTokens,
			topP: options.topP,
			frequencyPenalty: options.frequencyPenalty,
			presencePenalty: options.presencePenalty,
			timeout: options.timeout,
			maxRetries: options.maxRetries ?? 2,
			configuration,
			// OpenAI-compatible backend (Cloudflare gateway) — avoids sending strict:null
			// in tool definitions, which some providers reject. Needed for tool calling.
			supportsStrictToolCalling: false,
		});

		return { response: model };
	}
}
