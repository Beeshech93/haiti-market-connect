import React from 'react'
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import type { TemplateEntry } from './registry'

interface OrderItem {
  name?: string
  quantity?: number
  unit_price?: number
}

interface Props {
  customerName?: string
  orderNumber?: string
  items?: OrderItem[]
  subtotal?: number
  shippingCost?: number
  total?: number
  deliveryZone?: string
  etaDays?: number
}

const formatHtg = (value?: number) =>
  `${Math.round(Number(value ?? 0)).toLocaleString('fr-FR')} HTG`

const Email = ({
  customerName,
  orderNumber,
  items = [],
  subtotal,
  shippingCost,
  total,
  deliveryZone,
  etaDays,
}: Props) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>
      {orderNumber
        ? `Konfimasyon kòmand ${orderNumber} — Achtela`
        : 'Konfimasyon kòmand — Achtela'}
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>Achtela</Text>

        <Heading style={heading}>Mèsi pou kòmand ou !</Heading>
        <Text style={text}>
          {customerName ? `Bonjou ${customerName},` : 'Bonjou,'} nou resevwa kòmand ou
          {orderNumber ? ` ${orderNumber}` : ''}. Nou ap trete l kounye a.
        </Text>
        <Text style={muted}>
          Merci pour votre commande{orderNumber ? ` ${orderNumber}` : ''}. Nous la
          traitons dès maintenant.
        </Text>

        <Hr style={hr} />

        <Section>
          {items.map((item, index) => (
            <Text key={index} style={lineItem}>
              {item.quantity ?? 1} × {item.name ?? 'Pwodwi'} —{' '}
              {formatHtg((item.unit_price ?? 0) * (item.quantity ?? 1))}
            </Text>
          ))}
        </Section>

        <Hr style={hr} />

        <Text style={lineItem}>Sous-total / Sou-total : {formatHtg(subtotal)}</Text>
        <Text style={lineItem}>Livraison / Livrezon : {formatHtg(shippingCost)}</Text>
        <Text style={totalRow}>Total : {formatHtg(total)}</Text>

        {deliveryZone ? (
          <Text style={text}>
            Livraison / Livrezon : {deliveryZone}
            {etaDays ? ` — ${etaDays} jou / jours` : ''}
          </Text>
        ) : null}

        <Hr style={hr} />
        <Text style={muted}>
          Ou ka swiv kòmand ou nan kont ou sou Achtela. / Vous pouvez suivre votre
          commande depuis votre compte Achtela.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (data: Record<string, any>) =>
    data['orderNumber']
      ? `Konfimasyon kòmand ${data['orderNumber']} — Achtela`
      : 'Konfimasyon kòmand — Achtela',
  displayName: 'Confirmation de commande',
  previewData: {
    customerName: 'Marie',
    orderNumber: 'ACH-10234',
    items: [
      { name: 'Robe été fleurie', quantity: 1, unit_price: 2450 },
      { name: 'Sandales cuir', quantity: 2, unit_price: 1800 },
    ],
    subtotal: 6050,
    shippingCost: 350,
    total: 6400,
    deliveryZone: 'Port-au-Prince',
    etaDays: 3,
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Poppins, Arial, sans-serif' }
const container = { padding: '24px 28px', maxWidth: '560px' }
const brand = { color: '#0B3D91', fontSize: '20px', fontWeight: 700, margin: '0 0 16px' }
const heading = { color: '#0F172A', fontSize: '22px', margin: '0 0 12px' }
const text = { color: '#0F172A', fontSize: '15px', lineHeight: '22px', margin: '0 0 8px' }
const muted = { color: '#6B7280', fontSize: '13px', lineHeight: '20px', margin: '0 0 8px' }
const lineItem = { color: '#0F172A', fontSize: '14px', margin: '0 0 6px' }
const totalRow = { color: '#FF2D55', fontSize: '16px', fontWeight: 700, margin: '8px 0 0' }
const hr = { borderColor: '#E5E7EB', margin: '18px 0' }
