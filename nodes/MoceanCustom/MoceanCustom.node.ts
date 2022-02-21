import {
	IExecuteFunctions,
} from 'n8n-core';
import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeApiError,
	NodeOperationError,
} from 'n8n-workflow';

import { OptionsWithUri } from 'request';

export class MoceanCustom implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Mocean Custom',
		name: 'mocean-custom',
		icon: 'file:mocean.png',
		group: ['input'],
		version: 1,
		description: 'This node created for temporay to set DLR URL',
		defaults: {
			name: 'mocean-custom',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'moceanCustom',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				options:[
					{
						name: 'SMS',
						value: 'sms',
					},
					{
						name: 'Voice',
						value: 'voice',
					},
				],
				default: 'sms',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: [
							'sms',
							'voice',
						],
					},
				},
				options: [
					{
						name: 'Send',
						value: 'send',
						description: 'Send SMS/Voice message',
					},
				],
				default: 'send',
				description: 'The operation to perform.',
			},
			{
				displayName: 'From',
				name: 'from',
				type: 'string',
				default: '',
				placeholder: 'Sender Number',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'send',
						],
						resource: [
							'sms',
							'voice',
						],
					},
				},
				description: 'The number to which to send the message',
			},

			{
				displayName: 'To',
				name: 'to',
				type: 'string',
				default: '',
				placeholder: 'Receipient number',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'send',
						],
						resource: [
							'sms',
							'voice',
						],
					},
				},
				description: 'The number from which to send the message',
			},

			{
				displayName: 'Language',
				name: 'language',
				type: 'options',
				options:[
					{
						name: 'Chinese Mandarin (China)',
						value: 'cmn-CN',
					},
					{
						name: 'English (United Kingdom)',
						value: 'en-GB',
					},
					{
						name: 'English (United States)',
						value: 'en-US',
					},
					{
						name: 'Japanese (Japan)',
						value: 'ja-JP',
					},
					{
						name: 'Korean (Korea)',
						value: 'ko-KR',
					},
				],
				displayOptions: {
					show: {
						operation: [
							'send',
						],
						resource: [
							'voice',
						],
					},
				},
				default: 'en-US',
			},

			{
				displayName: 'Message',
				name: 'message',
				type: 'string',
				default: '',
				placeholder: '',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'send',
						],
						resource: [
							'sms',
							'voice',
						],
					},
				},
				description: 'The message to send',
			},

			{
				displayName: 'Delivery Report URL',
				name: 'dlr-url',
				type: 'string',
				default: '',
				placeholder: '',
				required: false,
				displayOptions: {
					show: {
						operation: [
							'send',
						],
						resource: [
							'sms',
						],
					},
				},
				description: 'Delivery report URL',
			}
		],
	};


	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		const credentials = await this.getCredentials('moceanCustom');

		if (credentials === undefined) {
			throw new NodeOperationError(this.getNode(), 'No credentials got returned!');
		}

		let endpoint: string;
		let operation: string;
		let requesetMethod: string;
		let resource: string;
		let text: string;
		let dlrUrl: string;
		let dataKey: string;
		// For Post
		let body: IDataObject;
		// For Query string
		let qs: IDataObject;

		for (let itemIndex  = 0; itemIndex  < items.length; itemIndex ++) {
			body = {};
			qs = {};
			try {
				resource = this.getNodeParameter('resource', itemIndex, '') as string;
				operation = this.getNodeParameter('operation',itemIndex,'') as string;
				text = this.getNodeParameter('message', itemIndex, '') as string;
				dlrUrl = this.getNodeParameter('dlr-url',itemIndex, '') as string;
				requesetMethod = 'POST';
				body['mocean-from'] = this.getNodeParameter('from', itemIndex, '') as string;
				body['mocean-to'] = this.getNodeParameter('to', itemIndex, '') as string;

				if (resource === 'voice') {
					const language: string = this.getNodeParameter('language', itemIndex) as string;
					const command = [
						{
							action: 'say',
							language,
							text,
						},
					];

					dataKey = 'voice';
					body['mocean-command'] = JSON.stringify(command);
					endpoint = '/rest/2/voice/dial';
				} else if(resource === 'sms') {
					dataKey = 'messages';
					body['mocean-text'] = text;
					if (dlrUrl !== '') {
						body['mocean-dlr-url'] = dlrUrl;
						body['mocean-dlr-mask'] = '1';
					}
					endpoint = '/rest/2/sms';
				} else {
					throw new NodeOperationError(this.getNode(), `Unknown resource ${resource}`);
				}

				if (operation === 'send') {

					body['mocean-api-key'] = credentials.apiKey;
					body['mocean-api-secret'] = credentials.apiSecret;
					body['mocean-resp-format'] = 'json';

					const options: OptionsWithUri = {
						method: requesetMethod,
						body,
						uri: `https://rest.moceanapi.com/${endpoint}`,
						json: true,
						headers: {
							'Content-Type': 'application/json',
						}
					};

					let responseData;

					try {
						responseData = await this.helpers.request(options);
					} catch (error) {
						throw new NodeApiError(this.getNode(), error);
					}

					for (const item of responseData[dataKey] as IDataObject[]) {
						item.type = resource;
						returnData.push(item);
					}

				} else {
					throw new NodeOperationError(this.getNode(), `Unknown operation ${operation}`);
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ error: error.message });
					continue;
				}
				throw error;
			}
		}

		return [this.helpers.returnJsonArray(returnData)];
	}
}
