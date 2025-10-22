"use client"
import { deleteDoc, doc, setDoc } from 'firebase/firestore';
import { useState, useEffect, use } from 'react'
import { auth, firestore } from '../firebase/firebase';
import Navbar from '../Components/Navbar';
import Rightcontainer from '../Components/Rightcontainer';
import { useUsers } from '../constants';
import { onAuthStateChanged } from 'firebase/auth';
import Link from 'next/link';

type userprobs = {
    email: string;
    displayname: string;
    role?: string;
}

const page = () => {
    const { users, loading, refetch } = useUsers();

    const [shownewuserform, setShownewuserform] = useState(false);
    const [shownewuserdeleteform, setShownewuserdeleteform] = useState(false);
    const [userToDelete, setUserToDelete] = useState<string>("");
    const [isadmin, setisadmin] = useState<boolean>(false);


    const [newuseremail, setNewuseremail] = useState("");
    const [newusername, setNewusername] = useState("");
    const [newuserrole, setNewuserrole] = useState("viewer");



    const register_user = async ({ email, displayname, role }: userprobs) => {
        const userdocref = doc(firestore, "reg_users", email);
        try {
            console.log("Register button clicked");
            const userdocref = doc(firestore, "reg_users", email);
            await setDoc(userdocref, {
                email: email,
                displayName: displayname,
                role: role ? role : "viewer",
                createdAt: new Date()
            });
            alert("user registered");
            setShownewuserform(false);
            setNewuseremail("");
            setNewusername("");
            setNewuserrole("");
            await refetch();



        } catch (error) {
            alert("Error: " + error);
            console.error(error);
        }

    }

    const prepare_register = () => {
        if (newuseremail == "" || newusername == "") {
            alert("Please fill all the fields");
            return;
        }
        // if (users.find(u => u.email === newuseremail)) {
        //     alert("User already exists");
        //     return;
        // }
        register_user({ email: newuseremail, displayname: newusername, role: newuserrole });

    }

    const removeuser = async (email: string) => {
        if (!users.find(u => u.email === email)) {
            alert("User does not exist");
            return;
        }
        // delete user from firestore
        try {
            const userdocref = doc(firestore, "reg_users", email);
            await deleteDoc(userdocref);
            alert("user removed");
            setShownewuserdeleteform(false);
            setUserToDelete("");
            await refetch();

        } catch (error) {
            alert("Error: " + error);
            console.error(error);
        }
    }

    const showeditform = (email: string, displayname: string, role?: string) => {
        setNewuseremail(email);
        setNewusername(displayname);
        setNewuserrole(role ? role : "viewer");
        setShownewuserform(true);
    }

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {


            if (users.find(u => u.email === user?.email)?.role === "admin") {
                setisadmin(true);
            }


        });
        return () => unsubscribe();
    }, [loading]);

    if (!loading && !isadmin) {
        return <div className=' w-screen h-screen overflow-hidden flex flex-col bg-blue-50 gap-4 justify-center items-center p-2 z-60 '>
            <div className=' text-sm text-gray-500  '>You are not authorized to view this page. Please contact admin.
            </div>
            <Link href={"/"} className=' text-sm hover:text-blue-600 text-blue-500 cursor-pointer font-medium ' > Go Home</Link>
        </div>



    }



    return (
        <main className=" flex gap-4 h-full w-full relative ">
            {/* left navigations */}
            <Navbar current_page="Users" />

            {/* SM Plan content */}
            <div className="flex flex-2">
                <div className='w-full h-full flex flex-col  mt-10 '>
                    <h1 className='text-lg font-bold mb-5 text-gray-500 w-full '>Manange Users</h1>
                    <div className='w-full flex flex-row-reverse'>
                        <button className='p-2 px-4 text-white bg-blue-400 hover:bg-blue-600 rounded-xl cursor-pointer text-sm' onClick={() => {
                            setShownewuserform(true); setNewuseremail("");
                            setNewusername("");
                            setNewuserrole("");
                        }}>+ Add New User</button>
                    </div>

                    <div className='mt-10 w-full px-10 '>
                        <div className='w-full flex justify-between border-b-2 border-gray-200 py-2 text-sm text-gray-600 bg-blue-100'>
                            <div className='w-[20%] text-center'>User email</div>
                            <div className='w-[20%] text-center'>User name </div>
                            <div className='w-[20%] text-center'>Role</div>
                            <div className='w-[40%] text-center '>Action</div>
                        </div>
                        {users.map((user, index) => (
                            <div key={index} className='w-full flex justify-between border-b-2 border-gray-200 py-2 text-sm'>
                                <div className='w-[20%] text-center'>{user.email}</div>
                                <div className='w-[20%] text-center'>{user.displayName}</div>
                                <div className='w-[20%] text-center'>{user.role}</div>

                                <div className='w-[40%] text-center flex gap-4 justify-center'>
                                    <div className=' text-center cursor-pointer hover:text-red-600 ' onClick={() => { setUserToDelete(user.email); setShownewuserdeleteform(true) }} >Remove</div>
                                    <div className='text-center cursor-pointer hover:text-orange-300 ' onClick={() => { showeditform(user.email, user.displayName, user.role) }}>Edit</div>
                                </div>

                            </div>


                        ))}


                    </div>
                </div>
            </div>

            {/* right container */}
            <Rightcontainer />


            {/* new user form */}
            <div className={`w-full h-full absolute  top-0 right-0   justify-center items-center ${shownewuserform ? "flex flex-col" : "hidden"} z-50 `}>


                <div className='relative w-full h-full flex justify-center items-center'>
                    <div className='absolute top-0 right-0 w-full h-full bg-gray-100 opacity-50 ' onClick={() => { setShownewuserform(false); }}></div>
                    <div className='border-2 w-[30%] p-4 items-center flex flex-col border-gray-50  z-20  gap-2 bg-white rounded-xl shadow-lg'>
                        <h1 className='font-bold text-lg'>Register New User</h1>
                        <input type="text" placeholder='Email' className=' text-sm p-2 border-2 border-blue-50 rounded-xl w-full' onChange={(e) => { setNewuseremail(e.target.value.trim()) }} value={newuseremail} />
                        <input type="text" placeholder='Display Name' className='text-sm p-2 border-2 border-blue-50 rounded-xl w-full' onChange={(e) => { setNewusername(e.target.value) }} value={newusername} />
                        <input type="text" placeholder='Role (admin/viewer)' className='text-sm p-2 border-2 border-blue-50 rounded-xl w-full' list='roles' onChange={(e) => { setNewuserrole(e.target.value) }} value={newuserrole} />
                        <datalist id="roles">
                            <option value="admin" />
                            <option value="Editor" />
                            <option value="viewer" />
                        </datalist>
                        <div className='w-full flex gap-4 justify-around mt-4'>
                            <button className='p-2 px-4 bg-gray-200 rounded-xl text-sm hover:bg-gray-300 cursor-pointer' onClick={() => { setShownewuserform(false); }}>Cancel</button>

                            <button className='p-2 px-4 bg-blue-400 rounded-xl text-sm text-white hover:bg-blue-600 cursor-pointer' onClick={prepare_register}>Register</button>

                        </div>


                    </div>
                </div>
            </div>

            {/* user delete confirm */}
            <div className={`w-full h-full absolute  top-0 right-0   justify-center items-center ${shownewuserdeleteform ? "flex flex-col" : "hidden"} z-50 `}>
                <div className='relative w-full h-full flex justify-center items-center'>
                    <div className='absolute top-0 right-0 w-full h-full bg-gray-100 opacity-50 ' onClick={() => { setShownewuserdeleteform(false); }}></div>
                    <div className='border-2 w-[30%] p-4 items-center flex flex-col border-gray-50  z-20  gap-2 bg-white rounded-xl shadow-lg'>
                        <h1 className='font-bold text-lg'>Are you sure you want to delete this user?</h1>
                        <div className='w-full flex gap-4 justify-around mt-4'>
                            <button className='p-2 px-4 bg-gray-200 rounded-xl text-sm hover:bg-gray-300 cursor-pointer' onClick={() => { setShownewuserdeleteform(false); }}>Cancel</button>
                            <button className='p-2 px-4 bg-red-400 rounded-xl text-sm text-white hover:bg-red-600 cursor-pointer' onClick={() => { removeuser(userToDelete) }}>Delete</button>
                        </div>
                    </div>
                </div>
            </div>

        </main>
    )
}

export default page
