import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from '@react-pdf/renderer';
import { InvoicePdfData } from '../types';

const styles = StyleSheet.create({
  page: { fontSize: 9, fontFamily: 'Helvetica', padding: 32, color: '#1a1a1a' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  businessName: { fontSize: 16, fontFamily: 'Helvetica-Bold', marginBottom: 2 },
  label: { color: '#555', fontSize: 8 },
  bold: { fontFamily: 'Helvetica-Bold' },
  title: { fontSize: 14, fontFamily: 'Helvetica-Bold', textAlign: 'center', marginBottom: 12 },
  divider: { borderBottom: '1pt solid #e0e0e0', marginVertical: 8 },
  partiesRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  partyBlock: { width: '48%' },
  table: { width: '100%', marginBottom: 12 },
  tableHeader: { flexDirection: 'row', backgroundColor: '#f5f5f5', padding: '4 2', borderBottom: '1pt solid #ddd' },
  tableRow: { flexDirection: 'row', padding: '3 2', borderBottom: '0.5pt solid #eee' },
  col: { flex: 1 },
  colNarrow: { width: 30 },
  colWide: { flex: 2 },
  summaryRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 2 },
  summaryLabel: { width: 120, textAlign: 'right', marginRight: 8 },
  summaryValue: { width: 70, textAlign: 'right' },
  grandTotal: { fontSize: 11, fontFamily: 'Helvetica-Bold', borderTop: '1pt solid #333', paddingTop: 4, marginTop: 4 },
  footer: { marginTop: 20, fontSize: 8, color: '#666' },
  qrBlock: { alignItems: 'flex-end', marginBottom: 8 },
});

function Address({ party }: { party: InvoicePdfData['business'] }) {
  if (!party.address) return null;
  const { line1, line2, city, state, postalCode } = party.address;
  return (
    <View>
      <Text>{line1}</Text>
      {line2 ? <Text>{line2}</Text> : null}
      <Text>{city}, {state} - {postalCode}</Text>
    </View>
  );
}

function SummaryLine({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={[styles.summaryLabel, bold ? styles.bold : {}]}>{label}</Text>
      <Text style={[styles.summaryValue, bold ? styles.bold : {}]}>{value}</Text>
    </View>
  );
}

function fmt(n: number) {
  return n.toFixed(2);
}

export function InvoiceDocument({ data }: { data: InvoicePdfData }) {
  const {
    invoiceNumber, invoiceDate, dueDate, irn, qrCodeDataUrl,
    business, customer, lineItems,
    subtotal, totalDiscount, totalTaxable,
    totalCgst, totalSgst, totalIgst, totalTax, grandTotal,
    notes, termsAndConditions, bankDetails, amountInWords,
  } = data;

  return (
    <Document>
      <Page size="A4" style={styles.page}>

        {/* Header */}
        <View style={styles.headerRow}>
          <View>
            {business.logo ? <Image src={business.logo} style={{ width: 80, marginBottom: 4 }} /> : null}
            <Text style={styles.businessName}>{business.name}</Text>
            {business.gstin ? <Text style={styles.label}>GSTIN: {business.gstin}</Text> : null}
            {business.phone ? <Text style={styles.label}>Ph: {business.phone}</Text> : null}
            {business.email ? <Text style={styles.label}>{business.email}</Text> : null}
            <Address party={business} />
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.title}>TAX INVOICE</Text>
            <Text><Text style={styles.bold}>Invoice No: </Text>{invoiceNumber}</Text>
            <Text><Text style={styles.bold}>Date: </Text>{invoiceDate}</Text>
            {dueDate ? <Text><Text style={styles.bold}>Due Date: </Text>{dueDate}</Text> : null}
          </View>
        </View>

        <View style={styles.divider} />

        {/* Parties */}
        <View style={styles.partiesRow}>
          <View style={styles.partyBlock}>
            <Text style={[styles.bold, { marginBottom: 3 }]}>Bill To:</Text>
            <Text style={styles.bold}>{customer.name}</Text>
            {customer.gstin ? <Text style={styles.label}>GSTIN: {customer.gstin}</Text> : null}
            {customer.phone ? <Text style={styles.label}>Ph: {customer.phone}</Text> : null}
            <Address party={customer as any} />
          </View>
          {irn ? (
            <View style={styles.partyBlock}>
              <Text style={styles.label}>IRN:</Text>
              <Text style={{ fontSize: 6 }}>{irn}</Text>
              {qrCodeDataUrl ? <Image src={qrCodeDataUrl} style={{ width: 80, marginTop: 4 }} /> : null}
            </View>
          ) : null}
        </View>

        <View style={styles.divider} />

        {/* Line Items Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.colNarrow}>#</Text>
            <Text style={styles.colWide}>Description</Text>
            <Text style={styles.col}>HSN</Text>
            <Text style={styles.col}>Qty</Text>
            <Text style={styles.col}>Rate</Text>
            <Text style={styles.col}>Disc</Text>
            <Text style={styles.col}>Taxable</Text>
            <Text style={styles.col}>GST%</Text>
            <Text style={styles.col}>GST Amt</Text>
            <Text style={styles.col}>Total</Text>
          </View>
          {lineItems.map((item) => {
            const gstRate = (item.cgstRate ?? 0) * 2 || (item.igstRate ?? 0);
            const gstAmt = (item.cgstAmount ?? 0) + (item.sgstAmount ?? 0) + (item.igstAmount ?? 0);
            return (
              <View key={item.slNo} style={styles.tableRow}>
                <Text style={styles.colNarrow}>{item.slNo}</Text>
                <Text style={styles.colWide}>{item.description}</Text>
                <Text style={styles.col}>{item.hsnCode ?? '-'}</Text>
                <Text style={styles.col}>{item.quantity} {item.unit ?? ''}</Text>
                <Text style={styles.col}>{fmt(item.unitPrice)}</Text>
                <Text style={styles.col}>{item.discount ? fmt(item.discount) : '-'}</Text>
                <Text style={styles.col}>{fmt(item.taxableAmount)}</Text>
                <Text style={styles.col}>{gstRate}%</Text>
                <Text style={styles.col}>{fmt(gstAmt)}</Text>
                <Text style={styles.col}>{fmt(item.totalAmount)}</Text>
              </View>
            );
          })}
        </View>

        {/* Summary */}
        <View>
          <SummaryLine label="Subtotal" value={fmt(subtotal)} />
          {totalDiscount > 0 ? <SummaryLine label="Discount" value={`-${fmt(totalDiscount)}`} /> : null}
          <SummaryLine label="Taxable Amount" value={fmt(totalTaxable)} />
          {totalCgst ? <SummaryLine label="CGST" value={fmt(totalCgst)} /> : null}
          {totalSgst ? <SummaryLine label="SGST" value={fmt(totalSgst)} /> : null}
          {totalIgst ? <SummaryLine label="IGST" value={fmt(totalIgst)} /> : null}
          <SummaryLine label="Total Tax" value={fmt(totalTax)} />
          <View style={styles.grandTotal}>
            <SummaryLine label="Grand Total" value={`₹ ${fmt(grandTotal)}`} bold />
          </View>
          {amountInWords ? (
            <Text style={[styles.label, { marginTop: 4 }]}>Amount in Words: {amountInWords}</Text>
          ) : null}
        </View>

        {/* Bank Details */}
        {bankDetails ? (
          <View style={{ marginTop: 12 }}>
            <Text style={[styles.bold, { marginBottom: 3 }]}>Bank Details:</Text>
            <Text>{bankDetails.bankName} | A/c: {bankDetails.accountNo} | IFSC: {bankDetails.ifsc}{bankDetails.branch ? ` | ${bankDetails.branch}` : ''}</Text>
          </View>
        ) : null}

        {/* Notes */}
        {notes ? (
          <View style={styles.footer}>
            <Text style={styles.bold}>Notes:</Text>
            <Text>{notes}</Text>
          </View>
        ) : null}

        {/* Terms */}
        {termsAndConditions ? (
          <View style={[styles.footer, { marginTop: 6 }]}>
            <Text style={styles.bold}>Terms & Conditions:</Text>
            <Text>{termsAndConditions}</Text>
          </View>
        ) : null}

        <View style={[styles.footer, { marginTop: 16, textAlign: 'right' }]}>
          <Text>Authorised Signatory</Text>
          <Text style={{ marginTop: 20 }}>________________________</Text>
          <Text>{business.name}</Text>
        </View>

      </Page>
    </Document>
  );
}
