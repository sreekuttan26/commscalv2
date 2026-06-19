'use client'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '../firebase/firebase'
import Navbar from '../Components/Navbar'
import Rightcontainer from '../Components/Rightcontainer'
import InstaLinksForm from '../Components/InstaLinksForm'

const SUBMIT_URL = "https://script.google.com/macros/s/AKfycbwknP86YXpLIu-qfPpCn9CJh9bIMzI7Rn4_pec7muAxdc66jebCmLM5hVBZ1n5WNahV_w/exec";
const FETCH_URL = "https://script.google.com/macros/s/AKfycbwcePjlwW_bUr1sDI_AK2DczLIVDGB0U_bJrV10klRLpTVRoO0aIWG75WBZLpu8KklS/exec";

const REFRESH_INTERVAL_MS = 30000;

type InstaLinkEntry = {
    title: string,
    link: string,
    addedBy: string,
    addedAt: string,
}

function formatRelative(iso: string): string {
    const date = new Date(iso);
    const diff = Date.now() - date.getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function toHref(link: string): string {
    return /^https?:\/\//i.test(link) ? link : `https://${link}`;
}

function LinkCard({ entry }: { entry: InstaLinkEntry }) {
    const validDate = entry.addedAt && !isNaN(new Date(entry.addedAt).getTime());

    return (
        <div className='w-full flex flex-col p-4 bg-white border-2 rounded-xl border-gray-200 gap-1'>
            <h2 className='font-semibold text-gray-800 text-sm'>{entry.title}</h2>
            <a
                href={toHref(entry.link)}
                target="_blank"
                rel="noopener noreferrer"
                className='text-xs text-blue-400 hover:text-blue-600 break-all'
            >
                {entry.link}
            </a>
            <div className='flex items-center gap-2 mt-1 text-[11px] text-gray-400'>
                <span>Added by {entry.addedBy}</span>
                <span>·</span>
                {validDate ? (
                    <span title={new Date(entry.addedAt).toLocaleString('en-IN')}>
                        {formatRelative(entry.addedAt)}
                    </span>
                ) : (
                    <span>unknown date</span>
                )}
            </div>
        </div>
    )
}

const Page = () => {
    const [useremail, setUseremail] = useState<string | null>(null);

    const [links, setLinks] = useState<InstaLinkEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [refreshError, setRefreshError] = useState(false);

    const [search, setSearch] = useState("");
    const [showForm, setShowForm] = useState(false);
    const [toastMsg, setToastMsg] = useState<string | null>(null);

    const hasLoadedRef = useRef(false);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setUseremail(user?.email ?? null);
        });
        return () => unsubscribe();
    }, []);

    const showToast = (message: string) => {
        setToastMsg(message);
        window.setTimeout(() => setToastMsg(null), 3000);
    }

    const fetchLinks = useCallback(async () => {
        const isInitial = !hasLoadedRef.current;
        if (isInitial) {
            setLoading(true);
        } else {
            setRefreshing(true);
        }

        try {
            const res = await fetch(FETCH_URL);
                console.log(res)
        
            if (!res.ok) throw new Error(`Request failed: ${res.status}`);
            const data = await res.json();
                console.log("data"+data)
            setLinks(Array.isArray(data) ? data : []);
            setError(false);
            hasLoadedRef.current = true;
        } catch {
            if (hasLoadedRef.current) {
                setRefreshError(true);
                window.setTimeout(() => setRefreshError(false), 4000);
            } else {
                setError(true);
            }
        } finally {
            if (isInitial) {
                setLoading(false);
            } else {
                window.setTimeout(() => setRefreshing(false), 1000);
            }
        }
    }, []);

    useEffect(() => {
        fetchLinks();
        const interval = setInterval(fetchLinks, REFRESH_INTERVAL_MS);
        return () => clearInterval(interval);
    }, [fetchLinks]);

    const sortedLinks = useMemo(() => {
        return [...links].sort((a, b) => {
            const at = new Date(a.addedAt).getTime();
            const bt = new Date(b.addedAt).getTime();
            const aValid = !isNaN(at);
            const bValid = !isNaN(bt);
            if (aValid && bValid) return bt - at;
            if (aValid) return -1;
            if (bValid) return 1;
            return 0;
        });
    }, [links]);

    const filteredLinks = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return sortedLinks;
        return sortedLinks.filter((l) =>
            l.title?.toLowerCase().includes(q) ||
            l.link?.toLowerCase().includes(q) ||
            l.addedBy?.toLowerCase().includes(q)
        );
    }, [sortedLinks, search]);

    const handleAddSuccess = () => {
        setShowForm(false);
        showToast("Link added");
        fetchLinks();
    }

    return (
        <main className=" flex gap-4 h-full w-full relative ">
            {/* left navigations */}
            <Navbar current_page="InstaLinks" />

            {/* InstaLinks content */}
            <div className="flex flex-2">
                <div className='w-full h-full flex flex-col mt-10 px-4 sm:px-10'>
                    <div className='w-full flex items-center justify-between mb-5'>
                        <h1 className='text-lg font-bold text-gray-500'>InstaLinks</h1>
                        {refreshing && <span className='text-xs text-gray-400 animate-pulse'>Refreshing...</span>}
                    </div>

                    <div className='w-full flex flex-col sm:flex-row gap-3 sm:justify-between sm:items-center mb-6'>
                        <div className='flex items-center gap-2 bg-gray-50 border-2 border-blue-50 rounded-xl px-3 py-2 w-full sm:max-w-sm'>
                            <span className='text-gray-400 text-sm'>🔍</span>
                            <input
                                type="text"
                                placeholder='Search by title…'
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className='bg-transparent text-sm outline-none text-gray-700 placeholder-gray-400 w-full'
                            />
                            {search && (
                                <button onClick={() => setSearch("")} className='text-gray-400 hover:text-gray-600 cursor-pointer'>×</button>
                            )}
                        </div>

                        <button
                            className='p-2 px-4 text-white bg-blue-400 hover:bg-blue-600 rounded-xl cursor-pointer text-sm whitespace-nowrap'
                            onClick={() => setShowForm(true)}
                        >
                            + Add Link
                        </button>
                    </div>

                    <div className='flex-1 overflow-y-auto pb-10'>
                        {loading ? (
                            <div className='w-full flex justify-center items-center py-20'>
                                <span className='w-8 h-8 border-2 border-blue-200 border-t-blue-500 rounded-full animate-spin' />
                            </div>
                        ) : error ? (
                            <div className='w-full flex flex-col items-center justify-center py-20 text-gray-400 gap-2'>
                                <span className='text-4xl'>⚠️</span>
                                <p className='font-medium text-gray-500'>Couldn&apos;t load links</p>
                                <button
                                    className='p-2 px-4 text-white bg-blue-400 hover:bg-blue-600 rounded-xl cursor-pointer text-sm mt-2'
                                    onClick={() => fetchLinks()}
                                >
                                    Try again
                                </button>
                            </div>
                        ) : filteredLinks.length === 0 ? (
                            search ? (
                                <div className='w-full flex flex-col items-center justify-center py-20 text-gray-400 gap-2'>
                                    <span className='text-4xl'>🔍</span>
                                    <p className='font-medium text-gray-500'>No links match &quot;{search}&quot;</p>
                                    <button
                                        className='text-sm text-blue-500 hover:text-blue-700 cursor-pointer mt-2'
                                        onClick={() => setSearch("")}
                                    >
                                        Clear search
                                    </button>
                                </div>
                            ) : (
                                <div className='w-full flex flex-col items-center justify-center py-20 text-gray-400 gap-2'>
                                    <span className='text-4xl'>📷</span>
                                    <p className='font-medium text-gray-500'>No links yet</p>
                                    <p className='text-sm'>Be the first to add one — click &quot;+ Add Link&quot; above.</p>
                                </div>
                            )
                        ) : (
                            <div className='flex flex-col gap-3'>
                                {filteredLinks.map((entry, index) => (
                                    <LinkCard key={index} entry={entry} />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* right container */}
            <Rightcontainer />

            {/* add link form */}
            {showForm && (
                <InstaLinksForm
                    submitUrl={SUBMIT_URL}
                    addedByEmail={useremail ?? ""}
                    onClose={() => setShowForm(false)}
                    onSuccess={handleAddSuccess}
                />
            )}

            {/* success toast */}
            {toastMsg && (
                <div className='fixed top-4 right-4 z-50 bg-white border-2 border-blue-300 shadow-2xl rounded-2xl px-4 py-3 text-sm text-gray-700'>
                    {toastMsg}
                </div>
            )}

            {/* refresh-failure banner (keeps stale data visible) */}
            {refreshError && (
                <div className='fixed top-4 right-4 z-50 bg-white border-2 border-amber-300 shadow-lg rounded-xl px-4 py-2 text-xs text-amber-600'>
                    Couldn&apos;t refresh
                </div>
            )}
        </main>
    )
}

export default Page
