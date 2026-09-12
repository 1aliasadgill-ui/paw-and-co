'use client';
import { StoreProvider,useStore } from './context';
import { Header,Footer } from './shell';
import { Home } from './home';
import { Listing } from './listing';
import { ProductDetail } from './product';
import { CartPage,Checkout } from './checkout';
import { Account } from './account';
import { ContentPage } from './content';
import { ProductGrid,Breadcrumb,Blank } from './shared';
import { TrackingConsent } from './tracking';
import type { Catalog } from '@/lib/types';
function Wishlist(){const {data,cart,loading}=useStore();return <main id="main" className="container wishlist-page"><Breadcrumb items={[{label:'Your wishlist'}]}/><div className="page-intro"><h1>A few favourites, saved.</h1><p>Keep the things you’ve got your eye on, all together.</p></div>{loading?<p>Loading your favourites…</p>:cart.wishlist.length?<ProductGrid products={data.products.filter(p=>cart.wishlist.includes(p.id))}/>:<Blank title="Good things are worth saving" text="Tap the heart on a product to keep it here for later." action="Explore the collection"/>}</main>;}
export function StorePage({data,route,query={}}:{data:Catalog;route:string[];query?:Record<string,string>}){let page;const p=route[0]||'';if(!p)page=<Home/>;else if(p==='products'){const product=data.products.find(p=>p.slug===route[1]);page=product?<ProductDetail product={product}/>:<Blank title="Product not available" text="This product is currently unavailable." action="Browse the shop"/>;}else if(['shop','dogs','cats','birds','fish','small-pets','search','offers','brands'].includes(p)||data.categories.some(c=>c.kind==='pet'&&c.slug===p))page=<Listing route={route} query={query}/>;else if(p==='cart')page=<CartPage/>;else if(p==='checkout')page=<Checkout/>;else if(p==='wishlist')page=<Wishlist/>;else if(p==='account')page=<Account route={route} query={query}/>;else page=<ContentPage route={route}/>;return <StoreProvider data={data}><a href="#main" className="skip-link">Skip to content</a><Header/>{page}<Footer/><TrackingConsent/></StoreProvider>;}
