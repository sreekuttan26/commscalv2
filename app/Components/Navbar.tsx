'use client'
import Link from 'next/link'
import React, { useEffect, useState } from 'react'
import { nav_items } from '../constants'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { auth } from '../firebase/firebase'
import { useUsers } from '../constants'
import Image from 'next/image'

type navprobes = {
  current_page?: string
}

const Navbar = ({ current_page }: navprobes) => {
  const { users, loading } = useUsers();
  const [isadmin, setisadmin] = useState<boolean>(false);
  const [username, setUsername] = useState<string | null>("null");
  const [useremail, setUseremail] = useState<string | null>("null");
  const [isHovered, setIsHovered] = useState<number | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUsername(user?.displayName ?? "Login");
      setUseremail(user?.email ?? "Login");
      if (users.find(u => u.email === user?.email)?.role === "admin") {
        setisadmin(true);
      }
    });
    return () => unsubscribe();
  }, [loading]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <div className="flex h-full z-20 sm:w-[200px] min-h-[99vh] flex-col 
      bg-gradient-to-b from-blue-900 via-blue-800 to-blue-900 
      text-white items-center rounded-r-2xl shadow-2xl border-r border-blue-700">

      {/* Logo Section */}
      <div className="w-full flex flex-col items-center py-6 px-4 
        border-b border-blue-700/50 bg-blue-950/30">
        <div className="relative w-16 h-16 mb-3">
          <div className="absolute inset-0 bg-blue-400/20 rounded-2xl blur-md"></div>
          <div className="relative bg-blue-950/50 p-2 rounded-2xl border border-blue-600/30">
            <Image
              unoptimized
              src="/logo_commscalv2.png"
              alt="Comms Cal v2"
              width={60}
              height={60}
              className="rounded-xl"
            />
          </div>
        </div>
        <h1 className="hidden sm:block text-sm font-bold text-blue-100 tracking-wider">
          CommsCal
        </h1>
        <span className="hidden sm:block text-[10px] text-blue-400 
          bg-blue-950/50 px-2 py-0.5 rounded-full mt-1 border border-blue-700/30">
          v2.0
        </span>
      </div>

      {/* Navigation Label */}
      <div className="w-full px-4 pt-4 pb-2">
        
      </div>

      {/* Nav Items */}
      <div className="flex flex-col gap-1 w-full px-3">
        {nav_items.map((item, index) => (
          <Link
            href={item.href}
            key={index}
            target={item.name === "Google sheet" ? "_blank" : ""}
            rel={item.name === "Google sheet" ? "noopener noreferrer" : ""}
            onMouseEnter={() => setIsHovered(index)}
            onMouseLeave={() => setIsHovered(null)}
            className={`group w-full p-2.5 flex items-center gap-3 rounded-xl 
              transition-all duration-200 relative overflow-hidden
              ${current_page === item.name
                ? "bg-white/15 text-white shadow-lg border border-white/20"
                : "text-blue-200 hover:bg-white/10 hover:text-white border border-transparent"
              }`}
          >
            {/* Active Indicator */}
            {current_page === item.name && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 
                bg-blue-400 rounded-r-full"></div>
            )}

            {/* Icon Container */}
            <div className={`flex items-center justify-center w-8 h-8 rounded-lg 
              transition-all duration-200 flex-shrink-0
              ${current_page === item.name
                ? "bg-white"
                : "bg-blue-950/40 group-hover:bg-white/10"
              }`}>
              <Image
                src={item.icon}
                alt={item.name}
                width={18}
                height={18}
                className="opacity-90"
              />
            </div>

            {/* Label */}
            <span className="hidden sm:block text-sm font-medium truncate">
              {item.name}
            </span>

            {/* External Link Indicator */}
            {item.name === "Google sheet" && (
              <span className="hidden sm:block ml-auto text-[10px] text-blue-400">
                ↗
              </span>
            )}
          </Link>
        ))}
      </div>

      {/* Admin Section */}
      {isadmin && (
        <div className="w-full px-3 mt-4">
          <div className="border-t border-blue-700/50 pt-4">
            <p className="hidden sm:block text-[10px] font-semibold text-blue-400 
              uppercase tracking-widest px-1 mb-2">
              Admin
            </p>
            <Link
              href="/users"
              className={`group w-full p-2.5 flex items-center gap-3 rounded-xl 
                transition-all duration-200 border
                ${current_page === "Users"
                  ? "bg-white/15 text-white shadow-lg border-white/20"
                  : "text-blue-200 hover:bg-white/10 hover:text-white border-transparent"
                }`}
            >
              {/* Active Indicator */}
              {current_page === "Users" && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 
                  bg-blue-300 rounded-r-full"></div>
              )}

              <div className={`flex items-center justify-center w-8 h-8 rounded-lg 
                transition-all duration-200 flex-shrink-0
                ${current_page === "Users"
                  ? "bg-white/20"
                  : "bg-blue-950/40 group-hover:bg-white/10"
                }`}>
                <Image
                  src="/user.png"
                  alt="Users"
                  width={18}
                  height={18}
                  className="opacity-90"
                />
              </div>
              <span className="hidden sm:block text-sm font-medium">Users</span>

              {/* Admin Badge */}
              <span className="hidden sm:block ml-auto text-[10px] bg-blue-500/40 
                text-blue-200 px-1.5 py-0.5 rounded-full border border-blue-500/30">
                Admin
              </span>
            </Link>
          </div>
        </div>
      )}

      {/* Spacer */}
      <div className="flex-1"></div>

      {/* User Profile & Logout */}
      <div className="w-full p-3 border-t border-blue-700/50">
        {/* User Info */}
        <div className="hidden sm:flex items-center gap-2 px-2 py-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-blue-500/40 border border-blue-400/30 
            flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-bold text-blue-200">
              {useremail !== "Login" ? useremail?.charAt(0).toUpperCase() : "?"}
            </span>
          </div>
          <div className="flex flex-col min-w-0">
            <p className="text-[10px] text-blue-300 font-medium truncate">
              {useremail !== "Login" ? useremail : "Not logged in"}
            </p>
            <p className="text-[9px] text-blue-500">
              {isadmin ? "Administrator" : "Member"}
            </p>
          </div>
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="group w-full p-2.5 flex items-center gap-3 rounded-xl 
            text-blue-300 hover:bg-red-500/20 hover:text-red-300 
            transition-all duration-200 border border-transparent 
            hover:border-red-500/30"
        >
          <div className="flex items-center justify-center w-8 h-8 rounded-lg 
            bg-blue-950/40 group-hover:bg-red-500/20 transition-all duration-200 flex-shrink-0">
            <Image
              src="/logout.png"
              alt="Logout"
              width={18}
              height={18}
              className="opacity-80"
            />
          </div>
          <span className="hidden sm:block text-sm font-medium">Logout</span>
        </button>
      </div>
    </div>
  );
};

export default Navbar;