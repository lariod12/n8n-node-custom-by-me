import { IExecuteFunctions } from 'n8n-core';
import { IDataObject, INodeExecutionData, INodeType, INodeTypeDescription } from 'n8n-workflow';

import { OptionsWithUri } from 'request';
import FormData from 'form-data';

// import axios from 'axios';

const apiArtellaRiot = 'https://riotgames-api.artella.com/v2';
const baseUrlArtellaRiot = 'https://riotgames.artella.com';
type BodyParameter = { name: string; value: string };
enum OPERATIONS {
	GETDETAILS = 'getDetails',
	UPDATE = 'update',
	DELETE = 'delete',
	CREATE = 'create',
	CREATEFEEDITEM = 'createFeedItem',
}
enum REQUEST_METHOD {
	GET = 'GET',
	POST = 'POST',
	PUT = 'PUT',
	DELETE = 'DELETE',
}
enum STATUS {
	On_Hold = 'On Hold',
	In_Progress = 'In Progress',
	Needs_Changes = 'Needs Changes',
	Needs_Review = 'Needs Review',
	Approved = 'Approved',
}
enum PREFIX_STATUS {
	held = 'artella:status:held',
	progress = 'artella:status:progress',
	changes = 'artella:status:changes',
	review = 'artella:status:review',
	done = 'artella:status:done',
}
// enum PREV_NODE_INPUT {
// 	DELIVERY_NOTES = "Delivery Notes",
// 	DELIVERY_STATUS = "Delivery Status",
// 	CHAMPION = "Champion (from Skin)",
// 	THEMATIC = "Thematic (from Skin)",
// 	SKIN_CONCEPT = "Skin Concept"
// }
export class Artella implements INodeType {
	description: INodeTypeDescription = {
		// Basic node details will go here
		displayName: 'Artella-Riot',
		name: 'artella',
		icon: 'file:artella.png',
		group: ['transform'],
		version: 1,
		description: 'Artella API',
		defaults: {
			name: 'Artella-Riot',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'artellaApi',
				required: true,
			},
		],
		properties: [
			// Resources and operations will go here
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				options: [
					{
						name: 'My Info',
						value: 'myinfo',
					},
					{
						name: 'Record',
						value: 'record',
					},
				],
				default: 'myinfo',
				noDataExpression: true,
				required: true,
				description: 'info from your account',
			},

			//just get info from account
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: ['myinfo'],
					},
				},
				options: [
					{
						name: 'Get',
						value: 'get',
						description: 'get your info details from Artella',
						action: 'Get My Info',
					},
				],
				default: 'get',
				noDataExpression: true,
			},

			//handle record
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: ['record'],
					},
				},
				options: [
					{
						name: 'Create a New Post',
						value: 'createFeedItem',
						description: 'Create new Post need use form data json',
						action: 'Create a post',
					},
					{
						name: 'Get Details',
						value: 'getDetails',
						description: 'Get details of feeditem id',
						action: 'Read Details by ID',
					},
				],
				default: 'createFeedItem',
				noDataExpression: true,
			},

			//=================================================UI Option select here ===========================================
			{
				displayName: 'Post ID',
				name: 'feeditemID',
				type: 'string',
				required: true,
				default: '',
				description:
					'Enter the Post ID that you want to get full info about eg: 6kvyd2mpkza2yvg4om7ziakvre',
				displayOptions: {
					show: {
						resource: ['record'],
						operation: ['getDetails'],
					},
				},
			},
			{
				displayName: 'Project ID',
				name: 'parent',
				type: 'string',
				required: true,
				default: '',
				description: 'Parent of feed items',
				displayOptions: {
					show: {
						resource: ['record'],
						operation: ['createFeedItem'],
					},
				},
			},
			{
				displayName: 'Content',
				name: 'content',
				type: 'string',
				required: true,
				default: '',
				description:
					'When defining a field from Airtable that you want to include in the content body, you can combine multiple fields by using a comma to separate them. For example, you could use "Delivery Status, Delivery Notes, Delivery Media" to include all three fields.',
				displayOptions: {
					show: {
						resource: ['record'],
						operation: ['createFeedItem'],
					},
				},
			},

			{
				displayName: 'Additional Tags',
				name: 'tag',
				type: 'fixedCollection',
				default: '',
				placeholder: 'Add More Tag',
				typeOptions: {
					multipleValues: true,
				},
				displayOptions: {
					show: {
						resource: ['record'],
						operation: ['createFeedItem'],
					},
				},
				options: [
					{
						displayName: 'Tags',
						name: 'tagValue',
						values: [
							{
								displayName: 'Tag Field',
								name: 'tagName',
								default: '',
								type: 'string',
								description:
									'Notice: You can only use tags that are valid for the current project on Artella.',
							},
						],
					},
				],
			},

			//input status
			{
				displayName: 'Status',
				name: 'status',
				type: 'string',
				default: '',
				description:
					'Notice: You can only use status that are valid for the current project on Artella.',
				displayOptions: {
					show: {
						resource: ['record'],
						operation: ['createFeedItem'],
					},
				},
			},
		],
	};

	// The execute method will go here
	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const errorHandleConsole = (
			err: any,
			indexItem: number = 0,
			feeditemID: string = '',
			tagNameArray: any[] = [],
		) => {
			console.log('---------------------------[Error here]---------------------------\n');
			let response;
			console.log(`----------- Start Error object at index[${indexItem}]: \n  `);
			console.error(err);
			console.log(`------ End Error object at index[${indexItem}] -------\n\n`);
			if (err['cause'] && err['cause'].response) {
				response = err['cause'].response;
				console.log(`------------------ Start Response object at index[${indexItem}]: \n `);
				console.error(response);
				console.log('-----------End Response object at index[${indexItem}]\n\n');
			}
			if (!response) {
				console.log('typeof !response', typeof response);
				console.log('!response', response);
				returnData.push(err.message);
			} else {
				let errResponse: any;
				if (feeditemID) {
					errResponse = {
						status: response.statusText,
						code: response.status,
						description:
							'error come from item with PostID: [' +
							feeditemID +
							']' +
							err.description +
							'or not authenticated',
					};
				}
				//add valid tags if does not exist, only work for admin permission
				else if (err.description.includes('not allowed to write this record')) {
					errResponse = {
						status: response.statusText,
						code: response.status,
						description: err.description,
						tagInput: tagNameArray,
						tag_permission_creation: false,
					};
				} else {
					errResponse = {
						status: response.statusText,
						code: response.status,
						description: err.description,
					};
				}

				returnData.push(errResponse);
			}
		};

		//for add new tag if does not exists -> upload new post and only for admin permission
		const addNewTagForPermission = async (
			formData: FormData,
			itemTagNameArray: string[],
			indexItem: number,
			parentID: string,
		) => {
			try {
				const options1: OptionsWithUri = {
					headers: {
						Accept: 'application/json',
					},
					method: REQUEST_METHOD.PUT,
					body: {
						add_valid_tags: itemTagNameArray,
					},
					json: true,
					uri: `${apiArtellaRiot}/record/project_validtags_${parentID}`,
				};
				console.log('options1 ->', options1);
				responseData = await this.helpers.requestWithAuthentication.call(
					this,
					'artellaApi',
					options1,
				);
				//after add tag if does not exists or if it exists already auto skip for safety add new tag
				itemTagNameArray.forEach((itemTagName) => {
					formData.append('tags', itemTagName);
				});
			} catch (err) {
				errorHandleConsole(err, indexItem, '', itemTagNameArray);
			}
		};

		// Handle data coming from previous nodes
		const items: any = this.getInputData();
		console.log('items', items);
		console.log('-----------------end items');
		const resource = this.getNodeParameter('resource', 0) as string;
		let responseData: any;
		const returnData: any = [];

		if (resource !== 'myinfo') {
			let recordHandle = this.getNodeParameter('recordHandle', 0, 'feeditem__') as string;
			if (!recordHandle) {
				recordHandle = 'feeditem__';
			}
			const operation = this.getNodeParameter('operation', 0) as string;

			// GET RECORD DETAILS
			if (operation === OPERATIONS.GETDETAILS) {
				let feeditemID;
				const prefixFeedItemID = 'feeditem__';

				//handle if  input is expression dynamic with multiple item
				if (Object.keys(items[0].json).length > 0) {
					// item.length always > 0  -> items [ { json: {}, pairedItem: { item: 0, input: undefined } } ]
					let indexItem = 0;
					const promise: Promise<any>[] = [];

					for (const itemJson of items) {
						if (Object.keys(itemJson?.pairedItem).length > 0) {
							try {
								indexItem = itemJson?.pairedItem?.item;
								feeditemID = this.getNodeParameter('feeditemID', indexItem, '') + '';
								console.log('feeditemID: ', feeditemID);
								console.log('typeof  feeditemID:', typeof feeditemID);
								if (!feeditemID) {
									throw new Error(
										`Post ID input from index [${indexItem}] cannot empty please check again`,
									);
								}
								let feeditemIDPrefix = '';
								if (!feeditemID.startsWith(prefixFeedItemID)) {
									feeditemIDPrefix = prefixFeedItemID + feeditemID;
								}
								//GET DETAILS OF THIS FEEDITEM
								const options: OptionsWithUri = {
									headers: {
										Accept: '*/*',
									},
									method: REQUEST_METHOD.GET,
									uri: `${apiArtellaRiot}/record/${feeditemIDPrefix}`,
								};
								promise.push(
									this.helpers.requestWithAuthentication.call(this, 'artellaApi', options),
								);
							} catch (error) {
								errorHandleConsole(error, indexItem, feeditemID);
							}
						}
					}

					try {
						const promiseResponseData: any[] = await Promise.all(promise);
						if (promiseResponseData.length > 0)
							promiseResponseData.forEach((itemResponse: any) => {
								let itemResponseConvert = JSON.parse(itemResponse);

								//rename for each feeditem__<someidhere> to feeditem
								const newKey = 'feeditem';
								const oldKey = Object.keys(itemResponseConvert)[0];
								itemResponseConvert[newKey] = itemResponseConvert[oldKey];
								delete itemResponseConvert[oldKey];

								returnData.push(itemResponseConvert);
							});
					} catch (error) {
						errorHandleConsole(error, indexItem);
					}
				}

				//handle if just type input fixed
				else {
					feeditemID = this.getNodeParameter('feeditemID', 0, '') + '';
					if (!feeditemID) {
						throw new Error(`Post ID input cannot empty please check again`);
					}
					let feeditemIDPrefix = '';
					if (!feeditemID.startsWith(prefixFeedItemID)) {
						console.log('prefixFeedItemID', prefixFeedItemID);
						feeditemIDPrefix = prefixFeedItemID + feeditemID;
					}
					console.log('after feeditemID:', feeditemIDPrefix);
					console.log('typeof feeditem', typeof feeditemIDPrefix);
					try {
						const options: OptionsWithUri = {
							headers: {
								Accept: '*/*',
							},
							method: REQUEST_METHOD.GET,
							uri: `${apiArtellaRiot}/record/${feeditemIDPrefix}`,
						};
						responseData = await this.helpers.requestWithAuthentication.call(
							this,
							'artellaApi',
							options,
						);
						if (typeof responseData == 'string') responseData = JSON.parse(responseData);
						returnData.push(responseData);
					} catch (error) {
						errorHandleConsole(error);
					}
				}
				//read only children_count
				// if (Object.entries(responseData).length > 0) {
				// 	console.log("responseData112", responseData)
				// 	console.log("type of responseData112", typeof responseData)
				// 	if (typeof responseData == "string")
				// 		responseData = JSON.parse(responseData);
				// 	console.log("responseData112 after", responseData)
				// 	const feedItemObject = responseData[Object.keys(responseData)[0]]
				// 	const feedItemChildrenNumber = feedItemObject["children_count"]
				// 	const feedItemChildrenCount = {
				// 		"children_count": feedItemChildrenNumber
				// 	}

				// 	returnData.push(responseData)
				// }
			}

			// CREATE -> NEW RECORD
			else if (operation === OPERATIONS.CREATE) {
				const dataForm = this.getNodeParameter(
					'bodyParameters.parameters',
					0,
					[],
				) as BodyParameter[];
				console.log(dataForm, ' dataform');
				// Make HTTP request according to https://sendgrid.com/docs/api-reference/
				// const options: OptionsWithUri = {
				// 	baseUrl: "https://riotgames-api.artella.com/v2",
				// 	headers: {
				// 		'Accept': 'application/json',
				// 	},
				// 	formData: {
				// 		dataForm
				// 		//to do : inject key-value BodyParameter[]
				// 	},
				// 	method: 'GET',
				// 	uri: `/${recordHandle}`,
				// };
				// responseData = await this.helpers.requestWithAuthentication.call(this, 'artellaApi', options);
			}

			// UPDATE -> RECORD
			else if (operation === OPERATIONS.UPDATE) {
				const dataForm = this.getNodeParameter(
					'bodyParameters.parameters',
					0,
					[],
				) as BodyParameter[];

				//AUTO UPDATE RECORD FROM INPUT PARAMETER ARTELLA
				console.log(dataForm, ' dataform');
				// Make HTTP request according to https://sendgrid.com/docs/api-reference/
				// const options: OptionsWithUri = {
				// 	baseUrl: "https://riotgames-api.artella.com/v2",
				// 	headers: {
				// 		'Accept': 'application/json',
				// 	},
				// 	formData: {
				// 		dataForm
				// 		//to do : inject key-value BodyParameter[]
				// 	},
				// 	method: 'GET',
				// 	uri: `/${recordHandle}`,
				// };
				// responseData = await this.helpers.requestWithAuthentication.call(this, 'artellaApi', options);
			}

			// DELETE -> RECORD
			else if (operation === OPERATIONS.DELETE) {
				// const dataForm = this.getNodeParameter("bodyParameters.parameters", 0, []) as BodyParameter[];
				// console.log(dataForm, " dataform");
				// // Make HTTP request according to https://sendgrid.com/docs/api-reference/
				// const options: OptionsWithUri = {
				// 	baseUrl: "https://riotgames-api.artella.com/v2",
				// 	headers: {
				// 		'Accept': 'application/json',
				// 	},
				// 	formData: {
				// 		dataForm
				// 		//to do : inject key-value BodyParameter[]
				// 	},
				// 	method: 'GET',
				// 	uri: `/${recordHandle}`,
				// };
				// responseData = await this.helpers.requestWithAuthentication.call(this, 'artellaApi', options);
			}

			// UPLOAD -> NEW POST
			else if (operation === OPERATIONS.CREATEFEEDITEM) {
				//========================HANDLE MANUAL UPLOAD NEW POST==================================
				//get data form paramater
				const parentID = this.getNodeParameter('parent', 0, '') as string;
				let tags;
				let status: string = '';
				let body: string = '';

				// valid object items
				let indexItem: number = 0;
				if (Object.keys(items[0].json).length !== 0) {
					const promise: Promise<any>[] = [];
					for (const itemJson of items) {
						console.log('itemJson', itemJson);
						const item: any = itemJson.json;
						const binaryObject: any = itemJson?.binary;
						indexItem = itemJson?.pairedItem?.item; // get index from  pairedItem: { item: 1, input: undefined } begin item:0 (typeof number)
						/*
						items [
							{
								json: {
								id: 'rec060KIdyVUpW8zv',
								createdTime: '2022-07-15T11:57:51.000Z',
								fields: [Object]
								},
								binary: { 'Delivery Media_0': [Object] },
								or if binary empty it's will show like this: -> binary: {},
								
								pairedItem: { item: 0, input: undefined }
							}
						]
						*/
						console.log('binaryObject', binaryObject);
						if (!binaryObject || !Object.keys(binaryObject)[0]) {
							// if do not have binary  data skip this
							returnData.push({
								binary_available: false,
								id: item.id,
							});
							continue;
						}
						console.log(`binaryObject ${indexItem}`, binaryObject);
						if (item?.fields) {
							tags = this.getNodeParameter('tag.tagValue', indexItem, []) as IDataObject[];
							status = this.getNodeParameter('status', indexItem, '') + '';
							body = this.getNodeParameter('content', indexItem, '') + '';

							// COMBINE ALL FIELD INPUT CONTENT TO BODY ARTELLA
							console.log(`---contentValue index ${indexItem}---`, body);

							// [old] detach between comma
							// let contentValues = content.split(",").map((item: string) => item.trim());
							// let contentValues = content.split(",")
							// console.log(`----contentValue after split and trim  index ${index}---`, contentValues);
							// if (contentValues.length > 0 && contentValues[0] !== "") {
							// 	//loop for each field input
							// 	contentValues.forEach((nameOfField: string) => {
							// 		if (nameOfField in item.fields) {
							// 			body += item.fields[`${nameOfField}`];
							// 		}
							// 	});
							// }

							// if (contentValue) {
							// const regex = /^\s*[^,]+\s*,\s*\S.*/; // Always in the format of a sentence, followed by a comma and the sentence afterwards
							// if (regex.test(contentValue)) {
							// 	title = contentValue.split(",")[0];
							// body = contentValue.split(",").slice(1).join(",");
							// }

							//init formdata to request
							const formData = new FormData();
							formData.append('parent', `feeditem__${parentID}team`);
							formData.append('publish_date', 'now');
							formData.append('kind', 'post');
							// formData.append('subject', "[Sparx] Artella API testing"); we don't need subject
							formData.append('body', body);

							//FILES
							if (binaryObject) {
								const binaryObjectKeyArray = Object.keys(binaryObject);
								// console.log("objectkeys", Object.keys(binaryObject))
								// console.log("type of objectkeys", typeof Object.keys(binaryObject))
								for (let index = 0; index < binaryObjectKeyArray.length; index++) {
									let indexOffset = 1;
									indexOffset += index;
									const propertyNameBinary: string = binaryObjectKeyArray[index]; //etc : binary: { 'Delivery Media_0': [Object] } => Delivery Media_0

									//get info file from prev input by binary
									const { fileType, fileName } = binaryObject[propertyNameBinary];

									//handle file stream buffer for request
									if (fileName && fileType) {
										console.log(
											`indexitem ${indexItem} fileName indexOffset ${indexOffset}`,
											fileName,
										);
										console.log(
											`indexitem ${indexItem} fileType indexOffset ${indexOffset}`,
											fileType,
										);
										// const templateMp4Url = 'https://v5.airtableusercontent.com/v1/16/16/1681365600000/bTg9NwfHi2AcXbyIYqsPWg/pkwymu5CGi2PK2hT1TiBnUcCrwWYZkiNXp-nOJoVlWv1sSCeIuy2jUd7TqGtSiI1Qnv5tcS_ea-lC1Pgme1pQLASy6Pepqy0IDR1T76upZJRtB5gIJYmNSkKRJoM1LFx/2OQxVCVT2e2_zcGME_mG3bCnUaQ-x4DQhogRlZcGaF0'
										// const response = await axios.get(templateMp4Url, { responseType: 'stream' });
										// console.log("response.data", response.data)
										// console.log("response data enddd")
										let binaryDataBufferItem = await this.helpers.getBinaryDataBuffer(
											indexItem,
											propertyNameBinary,
										);
										const bufferData = Buffer.from(binaryDataBufferItem);
										formData.append(`kind${indexOffset}`, fileType);
										formData.append(`file${indexOffset}`, bufferData, { filename: fileName });
										//handle if you want to save to local host machine
										// const targetDirectory = 'D:/';
										// // Tạo đường dẫn tệp đầu ra
										// const outputPath = path.join(targetDirectory, 'outputTemporate');

										// // Tạo thư mục nếu nó chưa tồn tại
										// if (!fs.existsSync(outputPath)) {
										// 	fs.mkdirSync(outputPath, { recursive: true });
										// }
										// const outputFile1 = path.join(outputPath, 'outputFile1.mp4');

										// fs.writeFile(outputFile1, binaryDataBufferItem, (err) => {
										// 	if (err) throw err;
										// 	console.log('The file has been saved!');
										// });
									}
								}
							}

							//TAGS
							console.log(`\n begin tags index: ${indexItem}`);
							console.log(`tags: `, tags);
							console.log(`tags type: `, typeof tags);
							if (tags.length > 0) {
								//old -> work without await
								// tags.forEach((tagItem: any) => {
								// 	console.log('tagItem?.tagName ', tagItem?.tagName);
								// 	if (tagItem?.tagName) {
								// 		//tags  [ { tagName: [ 'Anivia' ] }, { tagName: [ 'Victorious' ] } ]
								// 		if (Array.isArray(tagItem?.tagName)) {
								// 			tagItem.tagName.forEach((itemTagName: any) => {
								// 				formData.append('tags', itemTagName);
								// 			});
								// 		} else {
								// 			// if param have any value have "," in , so that will convert this value to string eg: "Ravina, something,somehting" this will return type of string
								// 			let arrTagName = tagItem.tagName.split(',').map((item: any) => item.trim()); //split string value eg: ",API Test, someTag";
								// 			console.log('[before append fromData] arrTagName ', arrTagName);

								// 			arrTagName.forEach((itemTagName: any) => {
								// 				if (itemTagName) {
								// 					formData.append('tags', itemTagName);
								// 				}
								// 			});
								// 		}
								// 	}
								// });

								//new work with addNewTagForPermission need to use for...of to handle await function
								for (const tagItem of tags) {
									console.log('tagItem?.tagName ', tagItem?.tagName);
									if (tagItem?.tagName) {
										let itemTagNameArray = [];
										//tags  [ { tagName: [ 'Anivia' ] }, { tagName: [ 'Victorious' ] } ]
										if (Array.isArray(tagItem?.tagName)) {
											for (const itemTagName of tagItem.tagName) {
												itemTagNameArray.push(itemTagName);
											}
										} else {
											// if param have any value have "," in , so that will convert this value to string eg: "Ravina, something,somehting" this will return type of string
											let arrTagName = tagItem.tagName
												.toString()
												.split(',')
												.map((item: any) => item.trim()); //split string value eg: ",API Test, someTag";
											console.log('[before append fromData] arrTagName ', arrTagName);

											for (const itemTagName of arrTagName) {
												if (itemTagName) {
													itemTagNameArray.push(itemTagName);
												}
											}
										}
										await addNewTagForPermission(formData, itemTagNameArray, indexItem, parentID);
									}
								}
							}
							console.log(`end tags index: ${indexItem}\n`);

							//STATUS
							console.log(`\n begin status index: ${indexItem}`);
							console.log(`status: `, status);
							console.log(`status type: `, typeof status);
							//collection status fixed
							switch (status) {
								case STATUS.On_Hold:
									formData.append('tags', PREFIX_STATUS.held);
									break;

								case STATUS.Approved:
									formData.append('tags', PREFIX_STATUS.done);
									break;

								case STATUS.In_Progress:
									formData.append('tags', PREFIX_STATUS.progress);
									break;

								case STATUS.Needs_Changes:
									formData.append('tags', PREFIX_STATUS.changes);
									break;

								case STATUS.Needs_Review:
									formData.append('tags', PREFIX_STATUS.review);
									break;

								default:
									break;
							}
							console.log(`end status index: ${indexItem}\n`);

							console.log(
								`--------------------------------formdata  ${indexItem} --------------------------\n\n`,
								formData,
							);
							console.log(
								`--------------------------------End formdata  ${indexItem}--------------------------\n\n`,
							);

							//Make HTTP request
							//CREATE A NEW POST
							try {
								const options1: OptionsWithUri = {
									headers: {
										Accept: '*/*',
										...formData.getHeaders(),
									},
									formData,
									method: REQUEST_METHOD.POST,
									uri: `${apiArtellaRiot}/record/feeditem__`,
								};
								//old: responseData = await this.helpers.requestWithAuthentication.call(this, 'artellaApi', options1);
								//new:
								promise.push(
									this.helpers.requestWithAuthentication.call(this, 'artellaApi', options1),
								);
							} catch (err) {
								errorHandleConsole(err, indexItem);
							}
						} // end detect item?.fields
					} // end loop for each item input
					try {
						let promiseResponseData = await Promise.all(promise);
						console.log('promise1', promiseResponseData);
						if (promiseResponseData.length > 0) {
							const promise1: Promise<any>[] = [];
							let indexItem = 0;
							for (const itemResponseData of promiseResponseData) {
								if (typeof itemResponseData == 'string')
									responseData = JSON.parse(itemResponseData);
								// get full url from this feed item Id
								if ('record_handle' in responseData) {
									let feedItemID = responseData.record_handle;
									if (feedItemID) {
										try {
											//GET FEEDITEM ID FOR MAKE A URL BY THIS
											const options2: OptionsWithUri = {
												headers: {
													Accept: 'application/json',
												},
												method: 'GET',
												uri: `${apiArtellaRiot}/record/${responseData.record_handle}`,
											};
											// let responseDataFeedItemDetails = await this.helpers.requestWithAuthentication.call(this, 'artellaApi', options2);
											promise1.push(
												this.helpers.requestWithAuthentication.call(this, 'artellaApi', options2),
											);
										} catch (err) {
											errorHandleConsole(err, indexItem);
										}
									}
								}
								indexItem++;
							} // end loop promise 1

							let promiseResponseDataUrl = await Promise.all(promise1);
							console.log('promise2', promiseResponseDataUrl);

							for (let index = 0; index < promiseResponseDataUrl.length; index++) {
								const itemResponseDataUrl = promiseResponseDataUrl[index];
								let responseDataFeedItemDetails;
								if (typeof itemResponseDataUrl == 'string')
									responseDataFeedItemDetails = JSON.parse(itemResponseDataUrl);
								const { owner, id } =
									responseDataFeedItemDetails[Object.keys(responseDataFeedItemDetails)[0]]; // { "feeditem__dz3mrjk362eotf7oy64yt763sm": {...} }
								const ownerIdOnly = owner.replace('project__', '');
								const responseDataFeedItemUrl = {
									url: `${baseUrlArtellaRiot}/project/${ownerIdOnly}/feed/all?itemId=${id}`,
								};

								if (promiseResponseData.length > 0) {
									const itemPromiseResponseData = promiseResponseData[index];
									if (typeof itemPromiseResponseData == 'string')
										responseData = JSON.parse(itemPromiseResponseData);
									Object.assign(responseData, responseDataFeedItemUrl);
									/*
									result object.assign
									{
										"record_handle": "feeditem__qwjbkflnfuas6i7u43uf4pdls4",
										"url": `${baseUrlArtellaRiot}/project/${ownerIdOnly}/feed/all?itemId=${id}`
									}
									*/
									returnData.push(responseData);
								}
							}
						}
					} catch (error) {
						errorHandleConsole(error);
					}
				} // end valid object items

				// this case only test without input prev node -> standalone node
				// else {
				// 	tags = this.getNodeParameter('tag.tagValue', indexItem, []) as IDataObject[];
				// 	status = this.getNodeParameter('status', indexItem, '') + '';
				// 	body = this.getNodeParameter('content', indexItem, '') + '';
				// 	//init formdata to request
				// 	const formData = new FormData();
				// 	formData.append('parent', `feeditem__${parentID}team`);
				// 	formData.append('publish_date', 'now');
				// 	formData.append('kind', 'post');
				// 	// formData.append('subject', "[Sparx] Artella API testing"); we don't need subject
				// 	formData.append('body', body);

				// 	//TAGS
				// 	if (tags.length > 0) {
				// 		for (const tagItem of tags) {
				// 			if (tagItem?.tagName) {
				// 				let itemTagNameArray = [];
				// 				if (Array.isArray(tagItem?.tagName)) {
				// 					for (const itemTagName of tagItem.tagName) {
				// 						itemTagNameArray.push(itemTagName);
				// 					}
				// 				} else {
				// 					let arrTagName = tagItem.tagName
				// 						.toString()
				// 						.split(',')
				// 						.map((item: any) => item.trim());
				// 					console.log('[before append fromData] arrTagName ', arrTagName);

				// 					for (const itemTagName of arrTagName) {
				// 						if (itemTagName) {
				// 							itemTagNameArray.push(itemTagName);
				// 						}
				// 					}
				// 				}
				// 				await addNewTagForPermission(formData, itemTagNameArray, indexItem, parentID);
				// 			}
				// 		}
				// 	}
				// 	//STATUS
				// 	console.log(`\n begin status index: ${indexItem}`);
				// 	console.log(`status: `, status);
				// 	console.log(`status type: `, typeof status);
				// 	//collection status fixed
				// 	switch (status) {
				// 		case STATUS.On_Hold:
				// 			formData.append('tags', PREFIX_STATUS.held);
				// 			break;

				// 		case STATUS.Approved:
				// 			formData.append('tags', PREFIX_STATUS.done);
				// 			break;

				// 		case STATUS.In_Progress:
				// 			formData.append('tags', PREFIX_STATUS.progress);
				// 			break;

				// 		case STATUS.Needs_Changes:
				// 			formData.append('tags', PREFIX_STATUS.changes);
				// 			break;

				// 		case STATUS.Needs_Review:
				// 			formData.append('tags', PREFIX_STATUS.review);
				// 			break;

				// 		default:
				// 			break;
				// 	}
				// 	console.log(`end status index: ${indexItem}\n`);

				// 	console.log(
				// 		`--------------------------------formdata  ${indexItem} --------------------------\n\n`,
				// 		formData,
				// 	);
				// 	console.log(
				// 		`--------------------------------End formdata  ${indexItem}--------------------------\n\n`,
				// 	);

				// 	try {
				// 		const options1: OptionsWithUri = {
				// 			headers: {
				// 				Accept: '*/*',
				// 				...formData.getHeaders(),
				// 			},
				// 			formData,
				// 			method: REQUEST_METHOD.POST,
				// 			uri: `${apiArtellaRiot}/record/feeditem__`,
				// 		};
				// 		responseData = await this.helpers.requestWithAuthentication.call(
				// 			this,
				// 			'artellaApi',
				// 			options1,
				// 		);
				// 		returnData.push(responseData);
				// 	} catch (err) {
				// 		errorHandleConsole(err, indexItem);
				// 	}
				// }
				
			} // UPLOAD -> NEW POST
		} //end if !my info

		//GET MY INFO ARTELLA
		else {
			try {
				const options: OptionsWithUri = {
					headers: {
						Accept: 'application/json',
					},
					method: 'GET',
					uri: `${apiArtellaRiot}/auth/whoami`,
				};
				responseData = await this.helpers.requestWithAuthentication.call(
					this,
					'artellaApi',
					options,
				);

				//Convert HTML response data to json {}
				let result = '';

				if (typeof responseData == 'string') {
					result = responseData.replace(/&#34;/g, '"');
					const objectLineString = result.trim().split('\n');
					const rawString = objectLineString
						.join('\n')
						.replace(/<\/?pre>/g, '')
						.trim(); // Xóa khoảng trắng thừa

					const lines = rawString.split('\n');
					const userInfoIndex = lines.findIndex((line) => line.trim() === 'User Info');
					const authInfoLines = lines.slice(0, userInfoIndex);
					const userInfoLines = lines.slice(userInfoIndex + 1); // Bỏ qua dòng "User Info"

					const authInfo: any = {};
					authInfoLines.forEach((line) => {
						const [key, value] = line.split(':').map((part) => part.trim());
						if (key && value) {
							authInfo[key] = value;
						}
					});

					const userInfoString = userInfoLines
						.filter((line) => !line.trim().startsWith('//'))
						.join('\n')
						.replace(/:\s+/g, ':')
						.replace(/,\s+/g, ',');
					const userInfoUJson = JSON.parse(userInfoString);

					const combinedJson = {
						auth: authInfo,
						userinfo: userInfoUJson,
					};
					responseData = combinedJson;
					console.log(
						'================== responseData GET MY INFO ARTELLA ========= \n\n',
						responseData,
					);
					console.log('======= End responseData GET MY INFO ARTELLA ========= \n\n');
					returnData.push(responseData);
				}
			} catch (error) {
				returnData.push({
					AccessToken: 'Expired',
					ErrorMsg: error.message,
				});
			}
		}
		console.log('======================  returnData ========= \n\n', returnData);
		console.log('================= End returnData ========= \n\n');
		console.log('=====END CONSOLE LOG ======= \n\n\n\n');

		// Map data to n8n data structure
		return [this.helpers.returnJsonArray(returnData)];
	}
}
