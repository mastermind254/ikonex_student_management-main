import { Document, Page, Text, View, StyleSheet, pdf } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { padding: 36, fontFamily: "Helvetica", fontSize: 10, color: "#1a1f33" },
  schoolHeader: { textAlign: "center", marginBottom: 24 },
  schoolName: { fontSize: 18, fontWeight: "bold", textTransform: "uppercase" },
  schoolSub: { fontSize: 9, color: "#64748b", marginTop: 4 },
  receiptTitle: { fontSize: 14, fontWeight: "bold", textAlign: "center", marginBottom: 24, textDecoration: "underline" },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8, paddingBottom: 4, borderBottom: "1pt solid #e2e8f0" },
  label: { color: "#64748b" },
  value: { fontWeight: "bold" },
  totalBox: { marginTop: 16, padding: 12, backgroundColor: "#f8fafc", borderRadius: 4, flexDirection: "row", justifyContent: "space-between" },
  totalLabel: { fontSize: 12, fontWeight: "bold" },
  totalValue: { fontSize: 12, fontWeight: "bold", color: "#10b981" },
  footer: { position: "absolute", bottom: 36, left: 36, right: 36, textAlign: "center", color: "#64748b", fontSize: 8 }
});

type ReceiptData = {
  paymentId: string;
  studentName: string;
  admissionNumber: string;
  amount: number;
  date: string;
  method: string;
  reference: string;
};

function FeeReceipt(d: ReceiptData) {
  return (
    <Document>
      <Page size="A5" style={styles.page}>
        <View style={styles.schoolHeader}>
          <Text style={styles.schoolName}>Ikonex Academy</Text>
          <Text style={styles.schoolSub}>P.O Box 12345 - Nairobi, Kenya | info@ikonex.edu</Text>
        </View>

        <Text style={styles.receiptTitle}>OFFICIAL FEE RECEIPT</Text>

        <View style={{ marginBottom: 20 }}>
          <View style={styles.row}><Text style={styles.label}>Receipt No:</Text><Text style={styles.value}>{d.paymentId.split("-")[0].toUpperCase()}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Date:</Text><Text style={styles.value}>{new Date(d.date).toLocaleDateString()}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Student Name:</Text><Text style={styles.value}>{d.studentName}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Admission No:</Text><Text style={styles.value}>{d.admissionNumber}</Text></View>
        </View>

        <View style={{ marginBottom: 20 }}>
          <View style={styles.row}><Text style={styles.label}>Payment Method:</Text><Text style={styles.value}>{d.method}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Transaction Ref:</Text><Text style={styles.value}>{d.reference || "N/A"}</Text></View>
        </View>

        <View style={styles.totalBox}>
          <Text style={styles.totalLabel}>Amount Received:</Text>
          <Text style={styles.totalValue}>KES {Number(d.amount).toLocaleString()}</Text>
        </View>

        <Text style={styles.footer}>
          This is a computer generated receipt. Valid without signature.
        </Text>
      </Page>
    </Document>
  );
}

export async function buildReceipt(d: ReceiptData): Promise<Blob> {
  return await pdf(<FeeReceipt {...d} />).toBlob();
}
