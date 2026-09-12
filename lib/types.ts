export type Row = Record<string, any>;
export type Variant = { id:string; product_id:string; label:string; sku:string; price:number; sale_price:number|null; stock:number; low_stock:number; weight:number; barcode:string; image:string; backorder:number };
export type Product = { id:string; name:string; slug:string; brand_id:string; category_id:string; pet:string; description:string; details:string; attributes:string; image:string; gallery:string; video:string; featured:number; status:string; publish_at:string; seo_title:string; seo_description:string; demo:number; created_at:string; updated_at:string; variants:Variant[]; brand:string; category:string; rating:number; review_count:number; sold:number; cod_disabled:number };
export type Catalog = {products:Product[];categories:Row[];brands:Row[];pages:Row[];banners:Row[];settings:Row;available:boolean};
export type CartItem = {variant_id:string;quantity:number;unit_price:number;product:Product;variant:Variant};
export type Cart = {items:CartItem[];wishlist:string[];subtotal:number;user:Row|null};
export const money = (v:number) => 'Rs. '+Math.round(v||0).toLocaleString('en-PK');
export const price = (v:Variant) => v.sale_price!==null && v.sale_price < v.price ? v.sale_price : v.price;
export const slugify = (s:string) => s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
export const cities = ['Lahore','Karachi','Islamabad','Rawalpindi','Faisalabad','Multan','Gujranwala','Peshawar','Sialkot','Quetta','Hyderabad','Bahawalpur'];
export const provinces = ['Punjab','Sindh','Khyber Pakhtunkhwa','Balochistan','Islamabad Capital Territory','Azad Jammu and Kashmir','Gilgit-Baltistan'];
export const statuses = ['New','Confirmed','Processing','Packed','Shipped','Out for Delivery','Delivered','Cancelled','Returned','Refunded'];
export const roles = ['super_admin','manager','order_manager','inventory_manager','content_editor'];
export const permissions:Record<string,string[]> = {super_admin:['*'],manager:['products','inventory','orders','customers','categories','brands','discounts','content','reviews','reports','marketing'],order_manager:['orders','customers'],inventory_manager:['products','inventory','categories','brands'],content_editor:['content','marketing']};
export const can = (role:string,area:string) => !!permissions[role]?.some(p=>p==='*'||p===area);

// getRandomValues also works in HTTP development previews.
export function requestId(){if(typeof crypto.randomUUID==='function')return crypto.randomUUID();const bytes=crypto.getRandomValues(new Uint8Array(16));bytes[6]=(bytes[6]&15)|64;bytes[8]=(bytes[8]&63)|128;const hex=Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');return [hex.slice(0,8),hex.slice(8,12),hex.slice(12,16),hex.slice(16,20),hex.slice(20)].join('-');}
