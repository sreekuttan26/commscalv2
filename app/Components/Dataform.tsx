import React, { useEffect, useState } from 'react'
import { categorylist, itemprobes, mentionlist, platformlist, taskprobs } from '../constants'
import { db, firestore } from '../firebase/firebase';
import { ref, onValue, push, get, set, query, orderByChild, equalTo, update } from "firebase/database";
import { add } from 'date-fns';
import { doc, setDoc } from 'firebase/firestore';

type Props = {

    changeformvisibility: () => void,
    showToast?: (message: string) => void,
}

const Dataform = ({ changeformvisibility,showToast }: Props) => {

    const [mentions, setMentions] = useState<string[]>([]);
    const [assignedTo, setassign_to] = useState<string[]>([]);
    const [mentionstring, setMentionstring] = useState<string>("");

    const [date, setDate] = useState<string>("");
    const [title, setTitle] = useState<string>("");
    const [smDoc, setSmDoc] = useState<string>("");
    const [url, setUrl] = useState<string>("");
    const [imgUrl, setImgUrl] = useState<string>("");
    const [description, setDescription] = useState<string>("");
    const [category, setCategory] = useState<string>("");
    const [platform, setPlatform] = useState<string>("");
    const [remarks, setRemarks] = useState<string>("");

    const[ date_error, setDate_error]=useState<boolean>(false);
    const [categorry_error, setCategory_error]=useState<boolean>(false);
    const [title_error, setTitle_error]=useState<boolean>(false);



    useEffect(() => {

        setMentionstring(mentions.join(", "));
        console.log(date);

    }, [mentions, date, title, smDoc, url, imgUrl, description, category, platform, remarks]);

    const add_to_db = ({ date, createdon, title, smdoc, description, category, platform, url, img_url, sm_status, mention, website_status, remarks }: itemprobes) => {
        const dataRef = ref(db, '/items/');
        const newdataRef = push(dataRef);
        set(newdataRef, {
            date: date,
            createdon: createdon,
            title: title,
            smdoc: smdoc,
            description: description,
            category: category,
            platform: platform,
            url: url,
            img_url: img_url,
            sm_status: sm_status,
            mention: mention,
            remarks: remarks,
            website_status: website_status
        })
            .then(() => {
                console.log('Data added successfully!');
                showToast?showToast("Data added successfully!"):""

                clearform();
            })
            .catch((error) => {
                console.error('Error adding data:', error);
            });
    }

    const processDBpush = () => {

         if(date==""){
                setDate_error(true);
            }else{
                setDate_error(false);
            }
            if(title==""){
                setTitle_error(true);
            }else{
                setTitle_error(false);
            }   
            if(category==""){
                setCategory_error(true);
            }
            else{
                setCategory_error(false);
            }


        if (date == "" || title == "" || category == "") {
           
            alert("Please fill all the required fields");
            return;
        }
        add_to_db({
            date: date,
            createdon: new Date().toISOString().split('T')[0],
            title: title,
            smdoc: smDoc,
            description: description,
            category: category,
            platform: platform,
            url: url,
            img_url: imgUrl,
            sm_status: "",
            mention: mentionstring,
            website_status: false,
            remarks: remarks
        });
        changeformvisibility();
        add_to_sheet();

    }

    const clearform = () => {
        setDate("");
        setTitle("");
        setSmDoc("");
        setUrl("");
        setImgUrl("");
        setDescription("");
        setCategory("");
        setPlatform("");
        setRemarks("");
        setMentions([]);

        setDate_error(false);
        setTitle_error(false);
        setCategory_error(false);
    }

    const add_to_sheet = async () => {
        const base = "https://script.google.com/macros/s/AKfycbzQv0oxAnSlRgopSeS_85XQ6eY7cKiCFepklNJUPtmSPsF_FtYpXjvIh7P9iHfZ55Yezg/exec";
        const formated_date=date.split("-").reverse().join("/");
        const params = {
            date: formated_date,
            title: title,
            smdoc: smDoc,
            desc: description,
            cat: category,
            platform: platform,
            url: url,
            img_url: imgUrl,
            mention: mentionstring,
            remarks: remarks,
        };

        const query = Object.entries(params)
            .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v ?? '')}`)
            .join('&');

        const fullUrl = `${base}?${query}`;

        console.log("Full URL:", fullUrl);



        fetch(fullUrl).
        then(res => res.text())
            .then(response => {
                //alert("Resp:" + response);
                showToast?showToast("Sheet status: "+response):""
            })
            .catch(error => {
               showToast?showToast("Sheet Error: "+error):""
            });

    }



    return (
        <div className='w-full h-screen relative flex justify-center  ' >
            <div className='absolute top-0 left-0 bg-black opacity-15 w-full h-full' onClick={changeformvisibility}></div>

            <div className='absolute w-[90%] max-h-[80%] p-4 flex flex-col z-30 bg-white rounded-lg shadow-lg m-4 overflow-y-scroll ' >
                <h1 className='w-full text-xl font-semibold text-gray-700'>Add New Item</h1>

                <div className='w-full flex flex-col py-1 mt-4'>
                    <label className='text-sm font-medium text-gray-600 px-2'>Date *</label>
                    <input className={`p-2 border-2 ${date_error?"border-red-200":"border-gray-100"} rounded-xl shadow text-sm`} type='date' onChange={(e) => { setDate(e.target.value) }} value={date}></input>
                </div>

                <div className='w-full flex flex-col py-1 mt-4'>
                    <label className='text-sm font-medium text-gray-600 px-2'>Title *</label>
                    <input className={`p-2 border-2  ${title_error?"border-red-200":"border-gray-100"}  rounded-xl shadow text-sm`} type='text' onChange={(e) => { setTitle(e.target.value) }} value={title}></input>
                </div>

                <div className='w-full flex flex-col py-1 mt-4'>
                    <label className='text-sm font-medium text-gray-600 px-2'>SM Correction Doc URL</label>
                    <input className='p-2 border-2 border-gray-100 rounded-xl shadow text-sm' type='text' onChange={(e) => { setSmDoc(e.target.value) }} value={smDoc}></input>
                </div>

                <div className='w-full flex  py-1 mt-4 gap-5 flex-col sm:flex-row'>
                    <div className='w-full flex flex-col '>

                        <label className='text-sm font-medium text-gray-600 px-2'>URL</label>
                        <input className='p-2 border-2 border-gray-100 rounded-xl shadow text-sm' type='text' onChange={(e) => { setUrl(e.target.value) }} value={url}></input>
                    </div>
                    <div className='w-full flex flex-col '>

                        <label className='text-sm font-medium text-gray-600 px-2'>Image URL</label>
                        <input className='p-2 border-2 border-gray-100 rounded-xl shadow text-sm' type='text' onChange={(e) => { setImgUrl(e.target.value) }} value={imgUrl}></input>
                    </div>

                </div>


                <div className='w-full flex flex-col py-1 mt-4'>
                    <label className='text-sm font-medium text-gray-600 px-2'>Description</label>
                    <textarea className='p-2 border-2 border-gray-100 rounded-xl shadow text-sm' onChange={(e) => { setDescription(e.target.value) }} value={description} ></textarea>
                </div>


                <div className='w-full flex  py-1 mt-4 gap-5 flex-col sm:flex-row'>
                    <div className='w-full flex flex-col '>

                        <label className='text-sm font-medium text-gray-600 px-2'>Category *</label>
                        <input className={`p-2 border-2  ${categorry_error?"border-red-200":"border-gray-100"} rounded-xl shadow text-sm`} type='text' list='category' onChange={(e) => { setCategory(e.target.value) }} value={category}>
                        </input>
                        <datalist id='category'>
                            {categorylist.map((item, index) => (
                                <option key={index} value={item}>{item}</option>
                            ))}
                        </datalist>

                    </div>
                    <div className='w-full flex flex-col '>

                        <label className='text-sm font-medium text-gray-600 px-2'>Platform</label>
                        <input className='p-2 border-2 border-gray-100 rounded-xl shadow text-sm' type='text' list='platform' onChange={(e) => { setPlatform(e.target.value) }} value={platform}>
                        </input>
                        <datalist id='platform'>
                            {platformlist.map((item, index) => (
                                <option key={index} value={item}>{item}</option>
                            ))}
                        </datalist>
                    </div>

                </div>

                <div className='w-full flex flex-col py-1 mt-4'>
                    <label className='text-sm font-medium text-gray-600 px-2'>Mentions</label>
                    <input className='p-2 border-2 border-gray-100 rounded-xl shadow text-sm' type='text' list='mentions' onKeyDown={(e) => {
                        if (e.key === 'Enter' && e.currentTarget.value.trim() !== "") {
                            if (!mentions.includes(e.currentTarget.value.trim())) {
                                setMentions([...mentions, e.currentTarget.value.trim()]);
                                e.currentTarget.value = "";
                            } else {
                                e.currentTarget.value = "";
                            }
                        }
                    }}  >
                    </input>
                    <datalist id='mentions'>
                        {mentionlist.map((item, index) => (
                            <option key={index} value={item}>{item}</option>
                        ))}
                    </datalist>
                    <div className='text-xs text-gray-500 px-2 flex gap-2 mt-4 flex-wrap'>
                        {mentions.map((item, index) => (
                            <div className='border-2 p-2 flex gap-2 rounded-2xl' key={index}>
                                <div>{item}</div>
                                <div className='cursor-pointer' onClick={() => setMentions(mentions.filter((_, i) => i !== index))}
                                >x</div>
                            </div>
                        ))}
                    </div>


                </div>

                <div className='w-full flex flex-col py-1 mt-4'>
                    <label className='text-sm font-medium text-gray-600 px-2'>Remarks</label>
                    <textarea className='p-2 border-2 border-gray-100 rounded-xl shadow text-sm' onChange={(e) => { setRemarks(e.target.value) }} value={remarks}></textarea>
                </div>


                <div className='w-full flex justify-center gap-4 py-1 mt-4 flex-col sm:flex-row'>
                    <div className='px-4 py-2 border-2 border-red-300 shadow hover:bg-red-500 hover:text-white rounded-2xl cursor-pointer text-center' onClick={() => { clearform(); changeformvisibility(); }}>Cancel</div>

                    <div className='px-4 py-2 border-2 border-orange-300 shadow hover:bg-orange-500 hover:text-white rounded-2xl cursor-pointer text-center' onClick={() => { clearform() }}>Clear</div>

                    <div className='px-4 py-2 border-2 border-green-300 shadow hover:bg-green-500 hover:text-white rounded-2xl cursor-pointer text-center' onClick={() => { processDBpush() }}>Submit</div>
                </div>




            </div>

        </div>
    )
}

export default Dataform
