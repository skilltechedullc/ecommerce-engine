import ReceiptClient from './ReceiptClient'

export default async function ReceiptPage({
  searchParams,
}: {
  searchParams: Promise<{ orderId?: string; phone?: string }>
}) {
  const params = await searchParams
  return <ReceiptClient initialOrderId={params.orderId ?? ''} initialPhone={params.phone ?? ''} />
}
