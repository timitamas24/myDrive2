import { Request, Response } from "express";
import FileService from "../services/FileService";
import FolderService from "../services/FolderService";
import MongoService from "../services/ChunkService/MongoService";
import FileSystemService from "../services/ChunkService/FileSystemService";
import S3Service from "../services/ChunkService/S3Service";
import User, {UserInterface} from "../models/user";
import sendShareEmail from "../utils/sendShareEmail";
import { createStreamVideoCookie, removeStreamVideoCookie } from "../cookies/createCookies";
import { FileInterface } from "../models/file";

const fileService = new FileService()
const folderService = new FolderService()

type userAccessType = {
    _id: string,
    emailVerified: boolean,
    email: string,
    s3Enabled: boolean,
}

interface RequestTypeFullUser extends Request {
    user?: UserInterface,
    encryptedToken?: string,
    accessTokenStreamVideo?: string
}

interface RequestType extends Request {
    user?: userAccessType,
    encryptedToken?: string
}

type ChunkServiceType = MongoService | FileSystemService | S3Service;

class FileController {

    chunkService: ChunkServiceType;

    constructor(chunkService: ChunkServiceType) {

        this.chunkService = chunkService;
    }

    getThumbnail = async(req: RequestTypeFullUser, res: Response) => {

        if (!req.user) {

            return;
        }
    
        try {
            
    
            const user = req.user;
            const id = req.params.id;
    
            const decryptedThumbnail = await this.chunkService.getThumbnail(user, id);
        

            res.send(decryptedThumbnail);
    
        } catch (e) {

            console.log("\nGet Thumbnail Error File Route:", e.message);
            const code = !e.code ? 500 : e.code >= 400 && e.code <= 599 ? e.code : 500;
            res.status(code).send();
        }

    }

    getFullThumbnail = async(req: RequestTypeFullUser, res: Response) => {

        if (!req.user) {
            return;
        }

        try {

            const user = req.user;
            const fileID = req.params.id;

            await this.chunkService.getFullThumbnail(user, fileID, res);

        } catch (e) {

            console.log("\nGet Thumbnail Full Error File Route:", e.message);
            const code = !e.code ? 500 : e.code >= 400 && e.code <= 599 ? e.code : 500;
            res.status(code).send();
        }
    }

    uploadFile = async(req: RequestTypeFullUser, res: Response) => {

        if (!req.user) {
        
            return 
        }
    
        try {

            const user = req.user;
            const busboy = req.busboy;
            
            req.pipe(busboy);
    
            const file = await this.chunkService.uploadFile(user, busboy, req);
         
            res.send(file);
            
        } catch (e) {

            console.log("\nUploading File Error File Route:", e.message);
            const code = !e.code ? 500 : e.code >= 400 && e.code <= 599 ? e.code : 500;
            res.writeHead(code, {'Connection': 'close'})
            res.end();
        }
    }

    getPublicDownload = async(req: RequestType, res: Response) => {

        try {

            const ID = req.params.id;
            const tempToken = req.params.tempToken;
    
            await this.chunkService.getPublicDownload(ID, tempToken, res);
    
        } catch (e) {
    
            console.log("\nGet Public Download Error File Route:", e.message);
            const code = !e.code ? 500 : e.code >= 400 && e.code <= 599 ? e.code : 500;
            res.status(code).send();
        } 
    }

    removeLink = async(req: RequestType, res: Response) => {

        if (!req.user) {
            return;
        }
    
        try {
    
            const id = req.params.id;
            const userID = req.user._id;
    
            await fileService.removeLink(userID, id)
    
            res.send();
    
        } catch (e) {

            console.log("\nRemove Public Link Error File Route:", e.message);
            const code = !e.code ? 500 : e.code >= 400 && e.code <= 599 ? e.code : 500;
            res.status(code).send();
        }

    }

    makePublic = async(req: RequestType, res: Response) => {

        if (!req.user) {
            return;
        }
    
        try {

            const fileID = req.params.id;
            const userID = req.user._id;
    
            const token = await fileService.makePublic(userID, fileID);

            res.send(token);
    
        } catch (e) {
            
            console.log("\nMake Public Error File Route:", e.message);
            const code = !e.code ? 500 : e.code >= 400 && e.code <= 599 ? e.code : 500;
            res.status(code).send();
        }
    }

    getPublicInfo = async(req: RequestType, res: Response) => {

        try {

            const id = req.params.id;
            const tempToken = req.params.tempToken;
            
            const file = await fileService.getPublicInfo(id, tempToken);

            res.send(file);
    
        } catch (e) {
            
            console.log("\nGet Public Info Error File Route:", e.message);
            const code = !e.code ? 500 : e.code >= 400 && e.code <= 599 ? e.code : 500;
            res.status(code).send();
        }
    }

    makeOneTimePublic = async(req: RequestType, res: Response) => {

        if (!req.user) {
            return;
        }
    
        try {
    
            const id = req.params.id;
            const userID = req.user._id;
            
            const token = await fileService.makeOneTimePublic(userID, id);

            res.send(token);

        } catch (e) {
            
            console.log("\nMake One Time Public Link Error File Route:", e.message);
            const code = !e.code ? 500 : e.code >= 400 && e.code <= 599 ? e.code : 500;
            res.status(code).send();
        }

    }

    getFileInfo = async(req: RequestType, res: Response) => {

        if (!req.user) {
            return;
        }
    
        try {
    
            const fileID = req.params.id;
            const userID = req.user._id;
    
            const file = await fileService.getFileInfo(userID, fileID);
    
            res.send(file);
    
        } catch (e) {
            
            console.log("\nGet File Info Error File Route:", e.message);
            const code = !e.code ? 500 : e.code >= 400 && e.code <= 599 ? e.code : 500;
            res.status(code).send();
        }
    }

    getQuickList = async(req: RequestType, res: Response) => { 

        if (!req.user) {
            return;
        }
    
        try {
    
            const user = req.user;

            const quickList = await fileService.getQuickList(user);
            const lockedFldIDs = await folderService.getLockedFolders(user._id);
            let lid : string[] =[];
            lockedFldIDs.map(l => {
                if(l != undefined){
                    lid.push(l.toString());
                } 
            });

            // console.log("start quicklist");
            // console.log(lid);
            // console.log(quickList);
            // console.log(lockedFldIDs);

            let quick : FileInterface[] = [];
            quickList.map(ql => {
                // console.log(typeof ql.metadata.parent);
                // console.log(typeof lid);
                // console.log(typeof lockedFldIDs[0]);
                // console.log(typeof lockedFldIDs[1]);
                if(lid.includes(ql.metadata.parent)){

                } else {
                    quick.push(ql);
                }
            });
            // console.log(quick);
            // console.log("end quick list");

            res.send(quick);
    
        } catch (e) {
            
            console.log("\nGet Quick List Error File Route:", e.message);
            const code = !e.code ? 500 : e.code >= 400 && e.code <= 599 ? e.code : 500;
            res.status(code).send();
        }
    }

    getList = async(req: RequestType, res: Response) => {

        if (!req.user) {
            return
        }
    
        try {

            const user = req.user;
            const query = req.query;

            const parent = query.parent;
            console.log(parent);
            if(parent != undefined && parent != "/"){

                console.log("1: "+ user._id + " " + parent);
                const folder = await folderService.getFolderInfo(user._id, parent as string);
                console.log("1.1");

                if(folder.lockDate == undefined ){
                    const fileList = await fileService.getList(user, query);
                    console.log("2.0");

                    res.send(fileList);
                 } else {
                    console.log("2");
                    let ts = Date.now();
                    let currDate = new Date(ts);
                    console.log("3");
                    if(folder.lockDate > currDate){
                        console.log("4");
                        res.status(401).send("The folder it is locked until: " + folder.lockDate);
                    }
                    else{
                        console.log("5");
                        const fileList = await fileService.getList(user, query);

                        res.send(fileList);
                    }
                }
            }
            
            const fileList = await fileService.getList(user, query);

            res.send(fileList);
    
        } catch (e) {
            
            console.log("\nGet File List Error File Route:", e.message);
            const code = !e.code ? 500 : e.code >= 400 && e.code <= 599 ? e.code : 500;
            res.status(code).send();
        }
    }

    getDownloadToken = async(req: RequestTypeFullUser, res: Response) => {

        if (!req.user) {
            return 
        }
    
        try {

            const user = req.user;

            const tempToken = await fileService.getDownloadToken(user);
    
            res.send({tempToken});
    
        } catch (e) {
            
            console.log("\nGet Download Token Error File Route:", e.message);
            const code = !e.code ? 500 : e.code >= 400 && e.code <= 599 ? e.code : 500;
            res.status(code).send();
        }
    }

    getAccessTokenStreamVideo = async(req: RequestTypeFullUser, res: Response) => {

        if (!req.user) return;

        try {

            const user = req.user;

            const currentUUID = req.headers.uuid as string;

            const streamVideoAccessToken = await user.generateAuthTokenStreamVideo(currentUUID);

            createStreamVideoCookie(res, streamVideoAccessToken);

            res.send();

        } catch (e) {

            console.log("\nGet Access Token Stream Video Fle Route Error:", e.message);
            const code = !e.code ? 500 : e.code >= 400 && e.code <= 599 ? e.code : 500;
            res.status(code).send();
        }

    }

    removeStreamVideoAccessToken = async(req: RequestTypeFullUser, res: Response) => {

        if (!req.user) return;

        try {

            const userID = req.user._id;

            const accessTokenStreamVideo = req.accessTokenStreamVideo!;

            await User.updateOne({_id: userID}, {$pull: {tempTokens: {token: accessTokenStreamVideo}}});

            removeStreamVideoCookie(res);

            res.send();

        } catch (e) {

            console.log("\Remove Video Token File Router Error:", e.message);
            const code = !e.code ? 500 : e.code >= 400 && e.code <= 599 ? e.code : 500;
            res.status(code).send();
        }
    }

    // No longer needed, left for reference

    // getDownloadTokenVideo = async(req: RequestTypeFullUser, res: Response) => {

    //     if (!req.user) {
    //         return 
    //     }
    
    //     try {
    
    //         const user = req.user;
    //         const cookie = req.headers.uuid as string;
    
    //         const tempToken = await fileService.getDownloadTokenVideo(user, cookie);
    
    //         res.send({tempToken});
    
    //     } catch (e) {

    //         const code = e.code || 500;

    //         console.log(e);
    //         res.status(code).send()
    //     }
    // }

    removeTempToken = async(req: RequestTypeFullUser, res: Response) => {

        if (!req.user) {
            return 
        }
    
        try {

            const user = req.user
            const tempToken = req.params.tempToken;
            const currentUUID = req.params.uuid;

            await fileService.removeTempToken(user, tempToken, currentUUID);

            res.send();
            
        } catch (e) {

            console.log("\nRemove Temp Token Error File Route:", e.message);
            const code = !e.code ? 500 : e.code >= 400 && e.code <= 599 ? e.code : 500;
            res.status(code).send();
        }
    }

    streamVideo = async(req: RequestTypeFullUser, res: Response) => {

        if (!req.user) {
            return;
        }
    
        try {
    
            const user = req.user;
            const fileID = req.params.id;
            const headers = req.headers;

            await this.chunkService.streamVideo(user, fileID, headers, res, req);

        } catch (e) {

            console.log("\nStream Video Error File Route:", e.message);
            const code = !e.code ? 500 : e.code >= 400 && e.code <= 599 ? e.code : 500;
            res.status(code).send();
        }

    }

    downloadFile = async(req: RequestTypeFullUser, res: Response) => {

        if (!req.user) {
            return;
        }
    
        try {
    
            const user = req.user;
            const fileID = req.params.id;

            await this.chunkService.downloadFile(user, fileID, res);
    
        } catch (e) {
            
            console.log("\nDownload File Error File Route:", e.message);
            const code = !e.code ? 500 : e.code >= 400 && e.code <= 599 ? e.code : 500;
            res.status(code).send();
        } 
    }

    getSuggestedList = async(req: RequestType, res: Response) => {

        if (!req.user) {
            return;
        }
    
        try {
    
            const userID = req.user._id;
            let searchQuery = req.query.search || "";
    
            const {fileList, folderList} = await fileService.getSuggestedList(userID, searchQuery);
    
            return res.send({folderList, fileList})
    
    
        } catch (e) {
    
            console.log("\nGet Suggested List Error File Route:", e.message);
            const code = !e.code ? 500 : e.code >= 400 && e.code <= 599 ? e.code : 500;
            res.status(code).send();
        }
    }

    renameFile = async(req: RequestType, res: Response) => {

        if (!req.user) {
            return;
        }
    
        try {
    
            const fileID = req.body.id;
            const title = req.body.title
            const userID = req.user._id;
    
            await fileService.renameFile(userID, fileID, title)

            res.send();
            
        } catch (e) {
    
            console.log("\nRename File Error File Route:", e.message);
            const code = !e.code ? 500 : e.code >= 400 && e.code <= 599 ? e.code : 500;
            res.status(code).send();
        }
    
    }

    sendEmailShare = async(req: RequestType, res: Response) => {

        if (!req.user) {
            return;
        }

        try {
            
            const user = req.user!;
        
            const fileID = req.body.file._id;
            const respient = req.body.file.resp;
        
            const file = await fileService.getFileInfo(user._id, fileID);
        
            await sendShareEmail(file, respient)
        
            res.send()

        } catch (e) {
           
            console.log("\nSend Share Email Error File Route:", e.message);
            const code = !e.code ? 500 : e.code >= 400 && e.code <= 599 ? e.code : 500;
            res.status(code).send();
        }
    }

    moveFile = async(req: RequestType, res: Response) => {

        if (!req.user) {
            return;
        }
    
        try {
    
            const fileID = req.body.id;
            const userID = req.user._id;
            const parentID = req.body.parent;

            await fileService.moveFile(userID, fileID, parentID);

            res.send();
            
        } catch (e) {
    
            console.log("\nMove File Error File Route:", e.message);
            const code = !e.code ? 500 : e.code >= 400 && e.code <= 599 ? e.code : 500;
            res.status(code).send();
        }

    }

    deleteFile = async(req: RequestType, res: Response) => {

        if (!req.user) {
            return;
        }
    
        try {
    
            const userID = req.user._id;
            const fileID = req.body.id;
    
            await this.chunkService.deleteFile(userID, fileID);
    
            res.send()
    
        } catch (e) {
            
            console.log("\nDelete File Error File Route:", e.message);
            const code = !e.code ? 500 : e.code >= 400 && e.code <= 599 ? e.code : 500;
            res.status(code).send();
        }
    }
}

export default FileController;
