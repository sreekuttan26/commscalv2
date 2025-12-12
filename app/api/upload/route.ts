import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { Readable } from 'stream';

export async function POST(req: NextRequest) {
    const FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;
    const CLIENT_EMAIL = process.env.GOOGLE_DRIVE_EMAIL;
    const PRIVATE_KEY = process.env.GOOGLE_DRIVE_PRIVATE_KEY;

    console.log("Checking ENV variables...");
    console.log("Client Email:", process.env.GOOGLE_DRIVE_EMAIL);
    console.log("Folder ID:", process.env.GOOGLE_DRIVE_FOLDER_ID);
    // DO NOT log the whole private key, just a check for its existence
    console.log("Private Key length:", process.env.GOOGLE_DRIVE_PRIVATE_KEY?.length);

    if (!FOLDER_ID || !CLIENT_EMAIL || !PRIVATE_KEY) {
        return NextResponse.json(
            { error: 'Missing env variables' },
            { status: 500 }
        );
    }



    try {
        const formData = await req.formData();
        const file = formData.get('file') as Blob | null;
        const fileName: string = formData.get('fileName') as string;

        if (!file || !fileName) {
            return NextResponse.json(
                { error: "No file passed" },
                { status: 400 }
            );
        }


        //autherization
        const auth = new google.auth.GoogleAuth({
            credentials: {
                client_email: CLIENT_EMAIL,
                private_key: PRIVATE_KEY,
            },
            scopes: ['https://www.googleapis.com/auth/drive.file'],
        })
        const drive = google.drive({ version: 'v3', auth })


        const buffer = Buffer.from(await file.arrayBuffer());
        const media = {
            mimeType: file.type,
            body: Readable.from(buffer)
        }

        //metadata
        const fileMatadata: { name: string; parents: string[] } = {
            name: fileName,
            parents: [FOLDER_ID]
        }

        //uplaod
        const response = await drive.files.create({
            supportsAllDrives: true,
            requestBody: fileMatadata,
            media: media,
            fields: 'id,name, webViewLink'
        })
        const uploaddedFile = response.data;

        console.log("file ID: " + uploaddedFile.id)

        return NextResponse.json({
            message: "File uploaded successfully",
            fileID: uploaddedFile.id,
            filename: uploaddedFile.name,
            filelink: uploaddedFile.webViewLink
        }, { status: 200 }
        )






    } catch (error) {
        console.log("drive uploaded error " + error)

        return NextResponse.json({
            error: "upload failed"
        },
            { status: 500 }
        )

    }





}