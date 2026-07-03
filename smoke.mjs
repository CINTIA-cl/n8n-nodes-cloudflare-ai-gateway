import { ChatOpenAI } from '@langchain/openai';

const T = process.env.CF_TOKEN;
const A = process.env.CF_ACCOUNT;
const m = new ChatOpenAI({
	apiKey: T,
	model: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
	maxTokens: 5,
	configuration: {
		baseURL: `https://api.cloudflare.com/client/v4/accounts/${A}/ai/v1`,
		defaultHeaders: { 'cf-aig-gateway-id': 'default' },
	},
	supportsStrictToolCalling: false,
});
const r = await m.invoke('reply with the single word: ok');
console.log('OK', JSON.stringify(r.content));
