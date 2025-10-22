'use client'
import Link from 'next/link'
import React, { useEffect, useState } from 'react'
import { nav_items } from '../constants'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { auth } from '../firebase/firebase'
import { useUsers } from '../constants'
import { FcCalendar } from "react-icons/fc";
import Image from 'next/image'
type navprobes = {
  current_page?: string
}

const Navbar = ({ current_page }: navprobes) => {
  const { users, loading } = useUsers();
  const userlist = users.map(user => user.email);
  const [isadmin, setisadmin] = useState<boolean>(false);



  const [username, setUsername] = useState<string | null>("null");
  const [useremail, setUseremail] = useState<string | null>("null");
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUsername(user?.displayName ?? "Login");
      setUseremail(user?.email ?? "Login");

      if(users.find(u => u.email === user?.email)?.role ==="admin"){
        setisadmin  (true);
      }


    });
    return () => unsubscribe();
  }, [loading]);
   


  const handleLogout = async () => {
    try {
      await signOut(auth);
      console.log("User signed out.");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (

    <div className=" flex h-full z-20  sm:w-[170px] min-h-[99vh] rounded-r-xl  flex-col bg-blue-500 text-white items-center ">
      <div className='flex items-center  py-2 justify-center mt-4 mb-4 w-full flex-col '>
        {/* <FcCalendar size={20} /> 

        <div className=" hidden sm:flex text-lg font-bold mt-4 pb-5">Comms Cal v2</div> */}
        <div className="flex items-center justify-center  w-full  bg-blue-800 py-2 shadow-2xl flex-col">
          <Image unoptimized src="/logo_commscalv2.png" alt="Comms Cal v2"  width={100} height={100} className=' shadow-2xl ' /> 
          <p className="text-[10px] p-2 text-gray-300 ">Version: V2</p>


        </div>
        
      </div>

      {/* nav items */}
      <div className='flex flex-col p-2 gap-4 w-full sm:gap-8'>
        {nav_items.map((item, index) => (

          <Link href={item.href} key={index} className={`w-full p-2 flex justify-center gap-2 rounded-xl  items-center hover:bg-white
           hover:text-blue-950 cursor-pointer hover:font-bold ${current_page === item.name ? "bg-white text-blue-950" : ""}`} target={item.name==="Google sheet"?"_blank":""} rel={item.name==="Google sheet"?"noopener noreferrer":""} >
            <Image src={item.icon} alt={item.name}  width={20} height={20} className=' ' />
            <div className=' hidden sm:flex text-sm font-medium '>{item.name}</div>
            
          </Link>
       

      ))}
      </div>
     
      

      {/*for admin user */}
      <div className={`w-full p-2  items-center ${isadmin?"flex flex-col":"hidden"} `}>
       <h1 className='  text-xs w-full border-t-2 text-center align-middle text-gray-50 opacity-80 border-gray-50 justify-center rounded-xl pt-2 '></h1>

        <Link className={`text-sm w-full text-center align-middle p-2 m-3 hover:bg-white rounded-xl hover:font-bold flex gap-2 justify-center
        hover:text-blue-950 ${current_page === "Users" ? "bg-white text-blue-950" : ""}`}  href="/users">
           <Image src="/user.png" alt=""  width={20} height={20} className=' ' />
            <div className=' hidden sm:flex text-sm font-medium '>Users</div>
        </Link>
      </div>
      

      <div className='flex flex-col flex-1 w-full h-full justify-end items-center p-2 mb-4   '>

        <div className='text-xs cursor-pointer flex flex-col  hover:bg-red-600 w-full hover:text-white p-2 rounded-xl ' onClick={handleLogout}>
            <Image src="/logout.png" alt={"item.name"}  width={20} height={20} className=' ' />
          <p className='hidden sm:flex text-[8px] '>{useremail}</p>
         
           </div>

       

      </div>

    </div>
  )
 
}

export default Navbar
