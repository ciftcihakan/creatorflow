// components/contract/ContractDocument.tsx
// npm install @react-pdf/renderer
/// <reference types="@react-pdf/renderer" />

import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

export interface ContractData {
  brand:           string
  creatorName:     string
  handle:          string
  deliverables:    string
  product:         string
  postingFrom:     string
  postingTo:       string
  agreedFee:       number
  exclusivityDays: number
  usageMonths:     number
  contentDueDate:  string
  generatedAt:     string
  campaignName:    string
}

const s = StyleSheet.create({
  page: {
    paddingTop:    52,
    paddingLeft:   60,
    paddingRight:  60,
    paddingBottom: 70,
    fontFamily:    'Helvetica',
    backgroundColor: '#ffffff',
    fontSize:      10.5,
    color:         '#1a1a1a',
  },
  // Header
  header: {
    borderBottomWidth: 1.5,
    borderBottomColor: '#1a1a1a',
    paddingBottom:     14,
    marginBottom:      20,
    flexDirection:     'row',
    justifyContent:    'space-between',
    alignItems:        'flex-end',
  },
  brand:    { fontSize: 9, color: '#7c6af7', fontFamily: 'Helvetica-Bold', letterSpacing: 1 },
  title:    { fontSize: 13, fontFamily: 'Helvetica-Bold', textAlign: 'center', letterSpacing: 1.5 },
  subtitle: { fontSize: 8.5, color: '#888', marginTop: 3 },

  // Parties box
  parties: {
    backgroundColor: '#f8f8fa',
    borderRadius:    4,
    paddingTop:      11,
    paddingBottom:   11,
    paddingLeft:     14,
    paddingRight:    14,
    marginBottom:    18,
  },
  partiesText: { fontSize: 10.5, lineHeight: 1.6 },
  bold:        { fontFamily: 'Helvetica-Bold' },

  // Section label
  sectionLabel: {
    fontSize:      8.5,
    fontFamily:    'Helvetica-Bold',
    letterSpacing: 1.2,
    color:         '#888',
    marginBottom:  10,
    marginTop:     18,
  },

  // Clauses
  clause: { marginBottom: 10, lineHeight: 1.65 },
  num:    { fontFamily: 'Helvetica-Bold' },

  // Deal summary table
  table: {
    borderWidth:  1,
    borderStyle:  'solid',
    borderColor:  '#e8e8e8',
    borderRadius: 4,
    marginBottom: 18,
  },
  row: {
    flexDirection:   'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingTop:      7,
    paddingBottom:   7,
    paddingLeft:     12,
    paddingRight:    12,
  },
  rowLast: {
    flexDirection: 'row',
    paddingTop:    7,
    paddingBottom: 7,
    paddingLeft:   12,
    paddingRight:  12,
  },
  cell:    { flex: 1, fontSize: 10, color: '#666' },
  cellVal: { flex: 2, fontSize: 10, color: '#1a1a1a', fontFamily: 'Helvetica-Bold' },

  // Signature section — use marginRight instead of gap
  sigSection: {
    marginTop:   36,
    paddingTop:  20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    flexDirection: 'row',
  },
  sigBlockLeft:  { flex: 1, marginRight: 32 },
  sigBlockRight: { flex: 1 },
  sigLine:  { borderBottomWidth: 1, borderBottomColor: '#1a1a1a', height: 28, marginBottom: 6 },
  sigLabel: { fontSize: 8.5, color: '#666' },
  sigDate:  { fontSize: 8.5, color: '#999', marginTop: 4 },

  // Footer
  footer: {
    position:     'absolute',
    bottom:       28,
    left:         60,
    right:        60,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop:   7,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerText: { fontSize: 8, color: '#bbb' },
})

function fmt(d: string) {
  if (!d) return '—'
  try { return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) }
  catch { return d }
}

export function ContractDocument({ data }: { data: ContractData }) {
  const clauseOffset = data.contentDueDate ? 1 : 0

  return (
    <Document title={`${data.brand} × ${data.creatorName} — Collaboration Agreement`} author="Creatorflow">
      <Page size="A4" style={s.page}>

        {/* Header */}
        <View style={s.header}>
          <Text style={s.brand}>CREATORFLOW</Text>
          <View style={{ alignItems: 'center', flex: 1 }}>
            <Text style={s.title}>INFLUENCER COLLABORATION AGREEMENT</Text>
            <Text style={s.subtitle}>Generated {fmt(data.generatedAt)} · Confidential</Text>
          </View>
          <Text style={{ fontSize: 9, color: '#aaa', width: 80, textAlign: 'right' }}>{data.campaignName}</Text>
        </View>

        {/* Parties */}
        <View style={s.parties}>
          <Text style={s.partiesText}>
            This Influencer Collaboration Agreement is entered into between{' '}
            <Text style={s.bold}>{data.brand}</Text>
            {' '}("the Brand") and{' '}
            <Text style={s.bold}>{data.creatorName}</Text>
            {data.handle ? <Text> (@{data.handle})</Text> : null}
            {' '}("the Creator"), collectively referred to as "the Parties".
          </Text>
        </View>

        {/* Deal summary */}
        <Text style={s.sectionLabel}>DEAL SUMMARY</Text>
        <View style={s.table}>
          {[
            { l: 'Agreed fee',       v: `£${Number(data.agreedFee).toLocaleString()}` },
            { l: 'Deliverables',     v: data.deliverables },
            { l: 'Product',          v: data.product },
            { l: 'Posting window',   v: `${fmt(data.postingFrom)} – ${fmt(data.postingTo)}` },
            { l: 'Content due date', v: data.contentDueDate ? fmt(data.contentDueDate) : '—' },
            { l: 'Exclusivity',      v: `${data.exclusivityDays} days post final post` },
            { l: 'Usage rights',     v: `${data.usageMonths} months` },
          ].map((row, i, arr) => (
            <View key={row.l} style={i === arr.length - 1 ? s.rowLast : s.row}>
              <Text style={s.cell}>{row.l}</Text>
              <Text style={s.cellVal}>{row.v}</Text>
            </View>
          ))}
        </View>

        {/* Terms */}
        <Text style={s.sectionLabel}>TERMS & CONDITIONS</Text>

        <View style={s.clause}>
          <Text>
            <Text style={s.num}>1. Deliverables. </Text>
            Creator will produce <Text style={s.bold}>{data.deliverables}</Text> featuring <Text style={s.bold}>{data.product}</Text> in accordance with the brand brief and content guidelines provided by the Brand.
          </Text>
        </View>

        <View style={s.clause}>
          <Text>
            <Text style={s.num}>2. Posting Window. </Text>
            All content must be published between <Text style={s.bold}>{fmt(data.postingFrom)}</Text> and <Text style={s.bold}>{fmt(data.postingTo)}</Text>. Late posting may result in withheld payment at the Brand's discretion.
          </Text>
        </View>

        {data.contentDueDate ? (
          <View style={s.clause}>
            <Text>
              <Text style={s.num}>3. Content Submission. </Text>
              Creator must submit draft content for Brand approval no later than <Text style={s.bold}>{fmt(data.contentDueDate)}</Text>. The Brand will provide feedback within 2 business days.
            </Text>
          </View>
        ) : null}

        <View style={s.clause}>
          <Text>
            <Text style={s.num}>{3 + clauseOffset}. Compensation. </Text>
            The Brand agrees to pay Creator a total fee of <Text style={s.bold}>£{Number(data.agreedFee).toLocaleString()}</Text> within 30 days of all deliverables being posted and verified.
          </Text>
        </View>

        <View style={s.clause}>
          <Text>
            <Text style={s.num}>{4 + clauseOffset}. Exclusivity. </Text>
            Creator agrees not to publish promotional content for competing brands for <Text style={s.bold}>{data.exclusivityDays} days</Text> following the final post date.
          </Text>
        </View>

        <View style={s.clause}>
          <Text>
            <Text style={s.num}>{5 + clauseOffset}. Usage Rights. </Text>
            The Brand is granted a non-exclusive, royalty-free licence to repurpose, adapt, and distribute the created content across its marketing channels for a period of <Text style={s.bold}>{data.usageMonths} months</Text> from the posting date.
          </Text>
        </View>

        <View style={s.clause}>
          <Text>
            <Text style={s.num}>{6 + clauseOffset}. Disclosure &amp; Compliance. </Text>
            All posts must comply with ASA/CAP guidelines and be clearly labelled as a paid partnership (e.g. #ad). Creator accepts full responsibility for regulatory compliance.
          </Text>
        </View>

        <View style={s.clause}>
          <Text>
            <Text style={s.num}>{7 + clauseOffset}. Confidentiality. </Text>
            Both Parties agree to keep the financial terms of this agreement confidential unless required by law.
          </Text>
        </View>

        <View style={s.clause}>
          <Text>
            <Text style={s.num}>{8 + clauseOffset}. Governing Law. </Text>
            This agreement is governed by the laws of England and Wales. Any disputes shall be resolved in the courts of England and Wales.
          </Text>
        </View>

        {/* Signature block */}
        <View style={s.sigSection}>
          <View style={s.sigBlockLeft}>
            <View style={s.sigLine} />
            <Text style={s.sigLabel}>{data.brand}</Text>
            <Text style={s.sigLabel}>Authorised Representative</Text>
            <Text style={s.sigDate}>Date: _________________________</Text>
          </View>
          <View style={s.sigBlockRight}>
            <View style={s.sigLine} />
            <Text style={s.sigLabel}>{data.creatorName}</Text>
            <Text style={s.sigLabel}>Creator / Influencer</Text>
            <Text style={s.sigDate}>Date: _________________________</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>Creatorflow · Confidential · {data.brand} × {data.creatorName}</Text>
          <Text style={s.footerText} render={({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) => `Page ${pageNumber} of ${totalPages}`} fixed />
        </View>

      </Page>
    </Document>
  )
}
