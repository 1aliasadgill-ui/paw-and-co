import { StorePage } from '@/components/store/store-page';
import { catalog } from '@/lib/catalog';
export const dynamic = 'force-dynamic';
export async function generateMetadata(){const data=await catalog();return {robots:{index:!data.settings.demo_mode,follow:!data.settings.demo_mode}};}
export default async function Home() { return <StorePage data={await catalog()} route={[]} />; }
