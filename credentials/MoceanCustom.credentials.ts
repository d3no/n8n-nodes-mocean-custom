import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';


export class MoceanCustom implements ICredentialType {
	name = 'moceanCustom';
	displayName = 'Mocean Custom';
	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			default: '',
		},
        {
			displayName: 'API Secret',
			name: 'apiSecret',
			type: 'string',
			default: '',
		}
	];
}
