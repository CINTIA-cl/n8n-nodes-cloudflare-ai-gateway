import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class CloudflareAiGatewayApi implements ICredentialType {
	name = 'cloudflareAiGatewayApi';

	displayName = 'Cloudflare AI Gateway API';

	icon = { light: 'file:cloudflare.svg', dark: 'file:cloudflare.dark.svg' } as const;

	documentationUrl = 'https://github.com/CINTIA-cl/n8n-nodes-cloudflare-ai-gateway#readme';

	properties: INodeProperties[] = [
		{
			displayName: 'Account ID',
			name: 'accountId',
			type: 'string',
			required: true,
			default: '',
			description: 'Cloudflare Account ID (find it in the dashboard)',
		},
		{
			displayName: 'Gateway ID',
			name: 'gatewayId',
			type: 'string',
			default: 'default',
			description: 'AI Gateway name. The "default" gateway is created automatically on first request.',
		},
		{
			displayName: 'API Token',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			required: true,
			default: '',
			description:
				'Cloudflare API token with: AI Gateway - Run, AI Gateway - Read, Workers AI - Read',
		},
	];

	// ponytail: no credential `test` request yet (the model dropdown itself validates the
	// token on open). Add a /models/search probe later if a dedicated "Test" button is wanted.

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '=https://api.cloudflare.com/client/v4',
			url: '=/accounts/{{$credentials.accountId}}/ai/models/search',
		},
	};
}
