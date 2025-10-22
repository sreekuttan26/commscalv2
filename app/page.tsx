'use client';
import Image from "next/image";
import { itemprobes, nav_items, taskprobs } from "./constants";
import Link from "next/link";
import Navbar from "./Components/Navbar";
import Rightcontainer from "./Components/Rightcontainer";
import Googleauth from "./Components/Googleauth";
import { auth, firestore, listenToItems, listenToTasks } from "./firebase/firebase";
import { use, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { useUsers } from "./constants";
import { get } from "http";
import { orderByChild, query, ref } from "firebase/database";
import { format } from "date-fns";
import { doc, setDoc } from "firebase/firestore";
import Taskform from "./Components/Taskform";





export default function Home() {
  const { users, loading } = useUsers();
  const user_email_list = users.map(user => user.email);
  const user_name_list = users.map(user => user.displayName);

  const [current_task_user, Setcurrent_task_user] = useState("")
  const [current_task_status, Setcurrent_task_status] = useState("")

  const [items, Setitems] = useState<itemprobes[]>();
  const [tasks, Settasks] = useState<taskprobs[]>();
  const [filtered_tasks, Setfiltered_tasks] = useState<taskprobs[]>();


  const [itemcategories, Setitemcategories] = useState<string[]>([])

  const [startDate, setStartDate] = useState(new Date("2025-05-30"));
  const [endDate, setEndDate] = useState(new Date());
  const [filered_items, Setfileterd_items] = useState<itemprobes[]>()

  const [iseditformopen, setIseditformopen] = useState(false);








  const [useremail, setUseremail] = useState<string | null>("null");
  const [username, setUsername] = useState<string | null>("null");
  useEffect(() => {

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUseremail(user?.email ?? "No user signed in");
      setUsername(user?.displayName ?? "");
    });

    Setitemcategories([])
    Setitems([])
    Settasks([])

    listenToItems(Setitems)
    listenToTasks(Settasks)



    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const itemcatlist = [...new Set(items?.map(item => item.category || "Uncategorised") || [])];

    Setitemcategories(itemcatlist)

    getFilteredTasks()



  }, [items, tasks, current_task_status, current_task_user])

  useEffect(() => {
    Setfileterd_items(items?.filter(item => (new Date(item.date) >= new Date(startDate) &&
      new Date(item.date) <= new Date(endDate))

    ));

  }, [items, startDate, endDate])

  const formatDate = (date: Date) => date.toISOString().split("T")[0];

  const getFilteredTasks = () => {

    let task_user_selected = '';
    let task_status_selected = '';
    console.log('current_task_status=' + current_task_status)

    if (current_task_user.length >= 3) {
      task_user_selected = current_task_user

    }
    if (current_task_user.length <= 3 && current_task_status.length <= 3) {
      Setfiltered_tasks(
         [...(tasks ?? [])].sort((a, b) => new Date(b.date ?? 0).getTime() - new Date(a.date ?? 0).getTime()))
        //[...(tasks ?? [])].reverse()
        // [...(tasks ?? [])].sort(
        //   (a, b) =>
        //     new Date(b.date ?? b.createdon ?? 0).getTime() -
        //     new Date(a.date ?? a.createdon ?? 0).getTime()

        // ))
      return

    }

    if (current_task_status.length <= 3) {
      Setfiltered_tasks(tasks?.filter((task => (task.assigned_to?.includes(current_task_user)))))

      return;


    }

    if (current_task_status === 'Posted') {
      Setfiltered_tasks(tasks?.filter((task => (
        task.completed_by?.includes(current_task_user) && task.assigned_to?.includes(current_task_user)))))

    }

    if (current_task_status === 'Working') {
      Setfiltered_tasks(tasks?.filter((task => (
        !task.completed_by?.includes(current_task_user) && task.assigned_to?.includes(current_task_user)))))

    }








    // Setfiltered_tasks(
    //   tasks?.filter((task) => {
    //     const matchUser =
    //       current_task_user.length <= 3 ||
    //       (
    //       task.assigned_to?.includes(current_task_user) &&
    //       !task.completed_by?.includes(current_task_user));

    //     const matchStatus =
    //       current_task_status.length <= 3 ||
    //       (task.assigned_to?.includes(current_task_user) &&
    //       !task.completed_by?.includes(current_task_user));

    //       console.log('matchUser= '+matchUser)
    //       console.log('matchstatus '+matchStatus)

    //     return matchUser && matchStatus;
    //   })
    // );

  };
  const addToTask = ({ date, deadline, title, description, url, assigned_to }: taskprobs) => {
    try {
      const taskref = doc(firestore, "tasks", title);

      setDoc(taskref, {

        date: "2025-09-12",
        createdon: new Date().toISOString().split('T')[0],
        title: title,
        assigned_to: assigned_to,
        deadline: deadline,
        description: description,
        url: url,


        completed_by: [],
        current_status: "Working",

      }).then(() => {
        alert('Task added successfully!');
      }
      )

    } catch (error) { alert('Error adding task: ' + error) }
  }


  const prepapreTask = () => {
    const newTask: taskprobs = {

      createdon: new Date().toISOString().split('T')[0],
      deadline: new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      title: 'New Task ' + Math.floor(Math.random() * 1000),
      description: 'This is a new task description.',
      url: '',
      assigned_to: [useremail || 'sreekuttan@atree.org']
    };
    addToTask(newTask);
  }

  const managetaskform = (entry?: itemprobes) => {
    setIseditformopen(!iseditformopen);



  }





  return (
    <main className=" flex gap-4 h-full w-full ">
      {/* left navigations */}
      <Navbar current_page="Dashboard" />

      {/* Dashboard content */}
      <div className="flex flex-2 w-full flex-col h-full justify-center items-center relative">

        <h1 className="text-lg font-semibold text-gray-700 mt-4"> Welcome {username}</h1>
        <div className="w-full h-full flex flex-col justify-center items-center p-4 gap-4">

          {/* overview */}
          <div className="w-full flex flex-col border-2 border-blue-200 rounded-xl p-4 gap-4 bg-white shadow-lg relative">
            <div className={`w-full flex justify-between p-2 `}>
              <h1 className=" text-gray-700 text-sm font-semibold border-b-2 border-blue-400 w-10 uppercase align-baseline">Overview</h1>

              {/*------------------------------------------ start and end date [start] ----------------------------------------------------- */}
              <div className="flex gap-2" >

                <div className={`flex flex-col`}>
                  <p className={`text-[14px] px-2 text-blue-700`}>Start Date</p>
                  <input className={`px-2 border-2 border-gray-200 rounded-lg`} type="date" onChange={(e) => { setStartDate(new Date(e.target.value)) }} value={formatDate(startDate)}></input>
                </div>

                <div className={`flex flex-col`}>
                  <p className={`text-[14px] px-2 text-blue-700`}>End Date</p>
                  <input className={`px-2 border-2 border-gray-200 rounded-lg`} type="date" onChange={(e) => { setEndDate(new Date(e.target.value)) }} value={formatDate(endDate)}></input>
                </div>

              </div>
              {/*------------------------------------------ start and end date [end]----------------------------------------------------- */}

            </div>


            <div className="w-full p-4 flex gap-4 justify-between ">
              {itemcategories?.map((cat, index) => (
                <div key={index} className="flex  gap-2  ">
                  <div className="flex flex-col  items-center justify-center p-4 bg-blue-100 rounded-xl shadow-md " onClick={() => { }}>
                    <h1 className="text-2xl  font-bold text-gray-900">{filered_items?.filter(item => (item.category === cat)).length}</h1>
                    <p className="text-sm  text-gray-700 text-center">{cat}</p>
                  </div>


                </div>


              ))}
            </div>


          </div>
          {/*------------------------------------------ Overview [end] ----------------------------------------------------- */}

          {/*------------------------------------------- Pendding works [start] ----------------------------------------------------- */}
          <div className="w-full bg-white flex flex-col gap-2 border-2 rounded-xl border-blue-300 p-4 ">
            <h1 className=" text-gray-700 text-sm font-semibold border-b-2 border-blue-400 w-10 uppercase align-baseline">Tasks</h1>

            {/* users */}
            <div className="w-full flex gap-4 justify-between">

              {/* <div className='flex flex-row w-full '>

                <select className="border-0 focus:border-0 focus:ring-0 p-2 outline-none focus:outline-none " onChange={(e) => { Setcurrent_task_status(e.target.value) }}>
                  <option value="">All Tasks</option>
                  <option value="Working">Pending</option>
                  <option value="Pending Breakdown">Pending Breakdown</option>
                  <option value="Posted">Completed</option>
                </select>

              </div> */}

              {/* add new task */}
              <div className='flex flex-row w-full justify-center' onClick={() => { managetaskform() }}>

                <div className={` flex p-2 m-4 px-4 text-white hover:bg-blue-500 bg-blue-400 cursor-pointer rounded-2xl border-blue-200 border-2 text-sm`}>+ Add New Task</div>

              </div>

              <div className='absolute top-0 right-0 z-15  h-full w-full flex justify-center items-center' style={{ display: iseditformopen ? 'flex' : 'none' }}>
                <Taskform changeformvisibility={managetaskform} />

              </div>



              <div className='flex flex-row w-full  justify-end'>

                <select className="border-0 focus:border-0 focus:ring-0 p-2 outline-none focus:outline-none " onChange={(e) => { Setcurrent_task_user(e.target.value) }}>
                  <option value="">All</option>
                  {user_email_list.map((name, index) => (
                    <option key={index} value={name}>{name}</option>))}
                </select>

              </div>

            </div>




            {/* tasks */}
            <div className='w-full h-full flex  flex-col gap-4 max-h-[500px] overflow-y-scroll '>

              {filtered_tasks?.map((task, index) => (
                <div key={index} className="w-full flex flex-col border-2 border-gray-200 p-2  bg-white rounded-xl">
                  <h1 className=" font-semibold text-gray-600">{task.title}</h1>
                  <div className="w-full flex flex-row text-sm gap-4 mt-4 ">
                    <div className="w-full flex flex-row text-sm gap-4 ">
                      <p className='text-blue-400'> {task.date ? format(new Date(task.date), 'dd MMM') : 'No date'}</p>
                      <p className="text-red-400 ">{task.deadline ? format(new Date(task.deadline), 'dd MMM') : 'No DL'}</p>

                      <div className="w-full flex gap-2">
                        {task.assigned_to?.map((person, index) => (
                          <p key={index} className={`${task.completed_by?.includes(person) ? "bg-green-200" : "bg-gray-200"}  text-gray-700 border-2 border-gray-100 p-2 rounded-xl `}>{person}</p>

                        ))}

                      </div>


                    </div>



                  </div>
                </div>



              ))}





            </div>







          </div>
          <div></div>


        </div>








      </div>

      {/* right container */}
      <Rightcontainer />

    </main>
  );
}
