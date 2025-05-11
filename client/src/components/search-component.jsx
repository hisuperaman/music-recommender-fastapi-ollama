import { useNavigate, useLocation } from 'react-router-dom';
import { Input } from './ui/input';
import { useEffect, useRef, useState } from 'react';

import { useDebouncedCallback } from 'use-debounce'
import { ToggleGroup, ToggleGroupItem } from './ui/toggle-group';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch } from '@fortawesome/free-solid-svg-icons';
import { Button } from './ui/button';


export default function SearchComponent({query, setQuery, filter, setFilter, filters, onSearchQuery, onQueryEmpty}) {
    


    function handleQueryChange(e) {
        setQuery(e.target.value)
        if(e.target.value==='') {
            onQueryEmpty()
        }
    }

    function handleQueryKeyDown(e) {
        const key = e.key
        if(key==='Enter') {
            handleSearchClick()
        }
    }

    function handleSearchClick() {
        onSearchQuery(query, filter)
    }

    return (
        <div className='relative'>
            <div className='flex gap-2'>
                <Input value={query} onChange={handleQueryChange} onKeyDown={handleQueryKeyDown} placeholder="Search" />

                <Button type="button" className={'cursor-pointer'} onClick={handleSearchClick}>
                    <FontAwesomeIcon icon={faSearch} />
                </Button>
            </div>

            {
                query && (

                    <ToggleGroup onValueChange={(value)=>setFilter(value)} type="single" defaultValue={filter} className={'absolute -bottom-2 translate-y-[100%]'}>

                        {
                            filters.map((filter, index) => {
                                return (
                                    <ToggleGroupItem key={index} value={filter} aria-label={`Toggle ${filter}`}>
                                        <div>{filter}</div>
                                    </ToggleGroupItem>
                                )
                            })
                        }

                    </ToggleGroup>
                )
            }
        </div>
    )
}