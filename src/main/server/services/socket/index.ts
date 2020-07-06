import * as io from "socket.io-client";

// Internal Libraries
import { FileSystem } from "@server/fileSystem";
import { ResponseFormat, ChatResponse, MessageResponse, AttachmentResponse } from "@server/types";

// Database Dependency Imports
import { ConfigRepository } from "@server/databases/config";
import { ChatRepository } from "@server/databases/chat";
import { Connection } from "typeorm";

import { GetChatsParams, GetChatMessagesParams, GetAttachmentChunkParams } from "./types";

export class SocketService {
    db: Connection;

    server: SocketIOClient.Socket;

    chatRepo: ChatRepository;

    configRepo: ConfigRepository;

    fs: FileSystem;

    serverAddress: string;

    passphrase: string;

    /**
     * Starts up the initial Socket.IO connection and initializes other
     * required classes and variables
     *
     * @param chatRepo The iMessage database repository
     * @param configRepo The app's settings repository
     * @param fs The filesystem class handler
     */
    constructor(db: Connection, chatRepo: ChatRepository, configRepo: ConfigRepository, fs: FileSystem) {
        this.db = db;

        this.server = null;
        this.chatRepo = chatRepo;
        this.configRepo = configRepo;
        this.fs = fs;
    }

    /**
     * Sets up the socket listeners
     */
    async start(firstConnect = false): Promise<boolean> {
        if (!this.configRepo || !this.configRepo.get("serverAddress") || !this.configRepo.get("passphrase")) {
            console.error("Setup has not been completed!");
            return false;
        }

        return new Promise((resolve, reject) => {
            this.server = io(this.configRepo.get("serverAddress") as string, {
                query: {
                    guid: this.configRepo.get("passphrase")
                }
            });

            this.server.on("connect", () => {
                console.log("Connected to server via socket.");
                resolve(true);
            });

            this.server.on("disconnect", () => {
                console.log("Disconnected from socket server.");
                reject(new Error("Disconnected from socket."));
            });

            this.server.on("connect_error", () => {
                console.log("Unable to connect to server.");

                // If this is the first/initial connect, disconnect if there is an error
                if (firstConnect) this.server.disconnect();
                reject(new Error("Unable to connect to server."));
            });
        });
    }

    async getChats({ withParticipants = true }: GetChatsParams): Promise<ChatResponse[]> {
        return new Promise<ChatResponse[]>((resolve, reject) => {
            this.server.emit("get-chats", { withParticipants }, (res: ResponseFormat) => {
                if ([200, 201].includes(res.status)) {
                    resolve(res.data as ChatResponse[]);
                } else {
                    reject(res.message);
                }
            });
        });
    }

    async getChatMessages(
        identifier: string,
        { offset = 0, limit = 25, after = null, before = null, withChats = false, sort = "DESC" }: GetChatMessagesParams
    ): Promise<MessageResponse[]> {
        return new Promise<MessageResponse[]>((resolve, reject) => {
            this.server.emit(
                "get-chat-messages",
                {
                    identifier,
                    offset,
                    limit,
                    after,
                    before,
                    withChats,
                    sort
                },
                res => {
                    if ([200, 201].includes(res.status)) {
                        resolve(res.data as MessageResponse[]);
                    } else {
                        reject(res.message);
                    }
                }
            );
        });
    }

    async getAttachmentChunk(
        attachmentGuid,
        { start = 0, chunkSize = 1024, compress = false }: GetAttachmentChunkParams
    ): Promise<string> {
        return new Promise<string>((resolve, reject) => {
            this.server.emit(
                "get-attachment-chunk",
                {
                    identifier: attachmentGuid,
                    start,
                    chunkSize,
                    compress
                },
                res => {
                    if ([200, 201].includes(res.status)) {
                        resolve(res.data as string);
                    } else {
                        reject(res.message);
                    }
                }
            );
        });
    }
}

// import {createConnection, getManager} from "typeorm";
// import {Handle} from "../entities/messaging/Handle";
// import {chatPrevGetAllAction} from "../actions/ChatPrevGetAllAction";

// //Connect to server with socket
// export async function ConnectToServer(url, aGuid){

// }

// createConnection({
//     type: "sqlite",
//     database: "src/main/server/db/messaging.db",
//     entities: [
//         Handle
//     ],
//     synchronize: true,
//     logging: false
// }).then(async connection => {
//     const io = require('socket.io-client')
//     const socket = io("",{
//     query: {
//         guid: ""
//     }
//     })

//     // On Socket Connect
//     socket.on('connect', () => {
//     console.log(socket.connected)
//     const firstAppStartUp = true;

//     if (firstAppStartUp){
//         //Get all chats from server and save locally
//         // initFromServer();
//         GetAllChatsFromServer();
//         console.log("here");
//     } else{

//     }
//     });

//     // let handle = new Handle();
//     // handle.address = "";

//     //Get All Chats
//     function GetAllChatsFromServer() {
//         socket.emit('get-chats',true,(data) => {
//         console.log(data.data[0].participants[0].address);
//         await GetHandle();
//         chatPrevGetAllAction();

//         //Get Handle
//         asyncfunction GetHandle() {
//             let handleRepository = connection.getRepository(Handle);
//             let i;
//             for(i=0; i < Object.keys(data.data).length; i++){
//                 let handle = new Handle();
//                 if(data.data[i].participants[0].address != null) {
//                     handle.address = data.data[i].participants[0].address;
//                 };
//                 if(data.data[i].participants[0].country != null) {
//                     handle.country = data.data[i].participants[0].country;
//                 };
//                 if(data.data[i].participants[0].uncanonicalizedId != null) {
//                     handle.uncanonicalizedId = data.data[i].participants[0].uncanonicalizedId;
//                 } else{
//                     handle.uncanonicalizedId = "X:XX PM";
//                 };
//                 // console.log(handle.address);
//                 try {
//                     // return connection.manager
//                     //             .save(handle)
//                     //             .then(handle => {
//                     //                 console.log("handle has been saved. handle address is", handle.address);
//                     //             });
//                     handleRepository.save(handle);
//                     console.log("Handle saved");
//                 } catch (err){
//                     console.log(err);
//                 }

//             }
//         }

//             return data
//         })
//     }

// }).catch(error => console.log("TypeORM connection error: ", error));

// // const initFromServer = {

// // }

// //Get A Single Chat by guid
// function GetSingleChat(guid){
//     socket.emit("get-chat",{chatGuid: guid}, (data) =>{
//         console.log(data.data)
//         return data.data
//     })
// }

// //Get All Messages In A Chat
// function GetChatMessages(guid){
//     socket.emit("get-chat-messages",{identifier: guid}, (data) =>{
//         console.log(data.data)
//         return data.data
//     })
// }

// //Get Most Recent Message For A Given guid
// function GetMostRecentMessage(guid){
//     socket.emit("get-last-chat-message",{identifier: guid}, (data) =>{
//         console.log(data)
//         return data
//     })
// }

// //Get Attachment By guid
// function GetAttachmentByGUID(guid){
//     socket.emit("get-attatchment",{identifier: guid}, (data) =>{
//         console.log(data)
//         return data
//     })
// }

// //Get Attachment Chunk By guid
// function GetAttachmentChunkByGUID(guid){
//     socket.emit("get-attatchment-chunk",{identifier: guid}, (data) =>{
//         console.log(data)
//         return data
//     })
// }

// //Get Participants In A Chat
// function GetChatParticipants(guid){
//     socket.emit("get-participants",{identifier: guid}, (data) =>{
//         console.log(data)
//         return data
//     })
// }

// //Send A Message
// function SendMessage(chatGuid, myMessage) {
//     socket.emit("send-message",{guid: chatGuid, message: myMessage}, (data) =>{
//         console.log(data)
//         return data
//     })
// }

// //Send A Message With Chunked Attachments
// function SendMessageWithAttachment(guid, myMessage,myAttachmentData){
//     socket.emit("send-message-chunk",{guid: guid, message: myMessage, attachmentData: myAttachmentData}, (data) =>{
//         console.log(data)
//         return data
//     })
// }

// //Start A Chat
// function NewChat(guid, chatParticipants){
//     socket.emit("start-chat",{identifier: guid, participants: chatParticipants}, (data) =>{
//         console.log(data)
//         return data
//     })
// }

// //Rename A Group Chat
// function RenameGroupChat(guid, newGroupName) {
//     socket.emit("rename-group",{identifier: guid, newName: newGroupName}, (data) =>{
//         console.log(data)
//         return data
//     })
// }

// //Add A Participant To Chat
// function AddParticipantToChat(guid, participantAddress){
//     socket.emit("add-participant",{identifier: guid, address: participantAddress}, (data) =>{
//         console.log(data)
//         return data
//     })
// }

// //Remove A Participant To Chat
// function RemoveParticipantToChat(guid, participantAddress){
//     socket.emit("remove-participant",{identifier: guid, address: participantAddress}, (data) =>{
//         console.log(data)
//         return data
//     })
// }

// //Send Reaction (NOT IMPLEMENTED IN SERVER)
// function SendReaction(guid) {
//     socket.emit("send-reaction",{identifier: guid}, (data) =>{
//         console.log(data)
//     })
// }
