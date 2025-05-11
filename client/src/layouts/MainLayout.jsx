import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { Button } from "@/components/ui/button";
import { NavigationMenu, NavigationMenuContent, NavigationMenuItem, NavigationMenuLink, NavigationMenuList, NavigationMenuTrigger, navigationMenuTriggerStyle } from "@/components/ui/navigation-menu"
import { Link, NavLink, redirect, useLoaderData, useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHome, faMusic } from "@fortawesome/free-solid-svg-icons";
import { ToastContainer, toast } from 'react-toastify';
import { useCallback, useEffect, useRef, useState } from "react";
import { UserProfileDialog } from "@/components/user-profile-dialog";
import SearchComponent from "@/components/search-component";
import SearchPage from "@/pages/SearchPage";



export const mainLayoutLoader = async () => {
    const response = await fetch("http://localhost:8000/auth/verify", {
        credentials: "include",
    });

    if (!response.ok) {
        return redirect('/login')
    }

    const data = await response.json()
    return data
};

const filters = ['song', 'artist', 'genre', 'album'];


export default function MainLayout({ children }) {
    const navigate = useNavigate()

    const loaderData = useLoaderData()

    const [searchResults, setSearchResults] = useState(null)

    const [searchLoading, setSearchLoading] = useState(false)

    const [query, setQuery] = useState('')
    const [filter, setFilter] = useState(filters[0])

    const [hasMore, setHasMore] = useState(true);


    const handleSearchQuery = useCallback(async (q, filter) => {
        if (q && filter) {
            try {
                setSearchLoading(true)
                const response = await fetch(`http://localhost:8000/music/search-tracks?query=${q}&filter_by=${filter}`, {
                    method: 'get',
                    credentials: 'include'
                })
                if (!response.ok) {
                    return
                }
                const data = await response.json()

                setSearchResults(data.searchResults)

                setSearchLoading(false)

                if (data.searchResults.length < data.total_results) {
                    setHasMore(true)
                }
                else {
                    setHasMore(false)
                }
            }
            catch (e) {
                console.log(e)
            }
        }
    })

    function handleHomeClick(e) {
        setSearchResults(null)
        setSearchLoading(false)
        navigate('/')
    }

    return (
        <SidebarProvider className={'py-2'}>
            <AppSidebar setSearchLoading={setSearchLoading} setSearchResults={setSearchResults} setHasMore={setHasMore} />


            <main className="max-w-full w-full overflow-x-hidden">
                <div className="flex justify-between">
                    <NavigationMenu className={'flex'}>
                        <NavigationMenuList className={'flex-1 justify-between'}>

                            <NavigationMenuItem>
                                <Button variant={'outline'} onClick={handleHomeClick} className={'cursor-pointer'}>
                                    <FontAwesomeIcon icon={faHome} />
                                </Button>
                            </NavigationMenuItem>

                        </NavigationMenuList>
                    </NavigationMenu>

                    <NavigationMenu className={'flex flex-1'}>
                        <NavigationMenuList className={'flex-1 justify-between w-full'}>

                            <NavigationMenuItem>
                                <SearchComponent filters={filters} query={query} setQuery={setQuery} filter={filter} setFilter={setFilter} onSearchQuery={handleSearchQuery} onQueryEmpty={() => setSearchResults(null)} />
                            </NavigationMenuItem>

                        </NavigationMenuList>
                    </NavigationMenu>
                    <NavigationMenu className={'flex'}>
                        <NavigationMenuList className={'flex-1 justify-between'}>

                            <UserProfileDialog
                                avatar={loaderData.avatar}
                                avatarFallback={loaderData.full_name[0]}
                            />

                        </NavigationMenuList>
                    </NavigationMenu>
                </div>


                <SidebarTrigger />

                <div className="mt-4">

                {
                    searchLoading ? (
                        <div className="flex justify-center items-center">
                            <div className="animate-bounce mt-40 flex flex-col gap-2">
                                <FontAwesomeIcon icon={faMusic} className=" text-5xl" />
                                Fetching...
                            </div>
                        </div>
                    ) :
                        searchResults ? (
                            <SearchPage hasMore={hasMore} setHasMore={setHasMore} query={query} filter={filter} searchResults={searchResults} setSearchResults={setSearchResults} />
                        ) : (
                            children
                        )
                }
                </div>

            </main>


            <ToastContainer />
        </SidebarProvider>
    )
}