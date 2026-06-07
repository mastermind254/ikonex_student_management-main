import { Document, Page, Text, View, StyleSheet, pdf } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { padding: 36, fontFamily: "Helvetica", fontSize: 10, color: "#1a1f33" },
  schoolHeader: { textAlign: "center", marginBottom: 14, borderBottom: "2 solid #312e81", paddingBottom: 10 },
  schoolName: { fontSize: 18, fontWeight: 700, color: "#312e81", letterSpacing: 1 },
  schoolSub: { fontSize: 9, color: "#475569", marginTop: 2 },
  title: { fontSize: 12, fontWeight: 700, marginTop: 8, textTransform: "uppercase", letterSpacing: 1.2 },
  metaBlock: { flexDirection: "row", justifyContent: "space-between", marginBottom: 14, backgroundColor: "#f5f5fb", padding: 10, borderRadius: 4 },
  metaItem: { flexDirection: "column" },
  metaLabel: { fontSize: 8, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5 },
  metaValue: { fontSize: 11, fontWeight: 700, marginTop: 2 },
  table: { borderTop: "1 solid #e2e8f0", borderLeft: "1 solid #e2e8f0", marginTop: 6 },
  row: { flexDirection: "row", borderBottom: "1 solid #e2e8f0" },
  headRow: { backgroundColor: "#312e81" },
  th: { padding: 6, fontSize: 9, fontWeight: 700, color: "#fff", borderRight: "1 solid #e2e8f0" },
  td: { padding: 6, fontSize: 9, borderRight: "1 solid #e2e8f0" },
  col1: { flex: 3 }, col2: { flex: 1, textAlign: "right" }, col3: { flex: 1, textAlign: "center" },
  summary: { marginTop: 18, padding: 12, backgroundColor: "#eef2ff", borderRadius: 4 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  summaryLabel: { fontSize: 10, color: "#475569" },
  summaryValue: { fontSize: 11, fontWeight: 700, color: "#312e81" },
  footer: { marginTop: 30, flexDirection: "row", justifyContent: "space-between" },
  sigBlock: { width: "45%" },
  sigLine: { borderTop: "1 solid #1a1f33", marginTop: 32, paddingTop: 4, fontSize: 9, color: "#475569", textAlign: "center" },
});

export type ReportCardData = {
  student: { id: string; full_name: string; admission_number: string };
  stream: { name: string } | null;
  term: { name: string; year: number } | null;
  rows: Array<{ subject: { name: string; code: string }; cat1: number | null; cat2: number | null; exam: number | null; total: number; grade: string; position?: number }>;
  total: number;
  average: number;
  overallGrade: string;
  overallRemarks: string;
  overallPosition?: number;
  classSize: number;
};

function ReportCard(d: ReportCardData) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.schoolHeader}>
          <Text style={styles.schoolName}>IKONEX ACADEMY</Text>
          <Text style={styles.schoolSub}>Excellence • Integrity • Innovation</Text>
          <Text style={styles.title}>Student Report Card</Text>
        </View>

        <View style={styles.metaBlock}>
          <View style={styles.metaItem}><Text style={styles.metaLabel}>Student</Text><Text style={styles.metaValue}>{d.student.full_name}</Text></View>
          <View style={styles.metaItem}><Text style={styles.metaLabel}>Adm. No.</Text><Text style={styles.metaValue}>{d.student.admission_number}</Text></View>
          <View style={styles.metaItem}><Text style={styles.metaLabel}>Stream</Text><Text style={styles.metaValue}>{d.stream?.name ?? "—"}</Text></View>
          <View style={styles.metaItem}><Text style={styles.metaLabel}>Term</Text><Text style={styles.metaValue}>{d.term ? `${d.term.name} ${d.term.year}` : "—"}</Text></View>
        </View>

        <View style={styles.table}>
          <View style={[styles.row, styles.headRow]}>
            <Text style={[styles.th, styles.col1]}>Subject</Text>
            <Text style={[styles.th, styles.col2]}>CAT1</Text>
            <Text style={[styles.th, styles.col2]}>CAT2</Text>
            <Text style={[styles.th, styles.col2]}>EXAM</Text>
            <Text style={[styles.th, styles.col2]}>Total</Text>
            <Text style={[styles.th, styles.col3]}>Grade</Text>
            <Text style={[styles.th, styles.col3]}>Pos</Text>
          </View>
          {d.rows.map((r, i) => (
            <View key={i} style={styles.row}>
              <Text style={[styles.td, styles.col1]}>{r.subject.name}</Text>
              <Text style={[styles.td, styles.col2]}>{r.cat1 ?? "—"}</Text>
              <Text style={[styles.td, styles.col2]}>{r.cat2 ?? "—"}</Text>
              <Text style={[styles.td, styles.col2]}>{r.exam ?? "—"}</Text>
              <Text style={[styles.td, styles.col2]}>{r.total.toFixed(2)}</Text>
              <Text style={[styles.td, styles.col3]}>{r.grade}</Text>
              <Text style={[styles.td, styles.col3]}>{r.position ?? "—"}</Text>
            </View>
          ))}
        </View>

        <View style={styles.summary}>
          <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Total Marks</Text><Text style={styles.summaryValue}>{d.total.toFixed(2)}</Text></View>
          <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Average Score</Text><Text style={styles.summaryValue}>{d.average.toFixed(2)}</Text></View>
          <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Overall Grade</Text><Text style={styles.summaryValue}>{d.overallGrade}</Text></View>
          <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Class Position</Text><Text style={styles.summaryValue}>{d.overallPosition ?? "—"} / {d.classSize}</Text></View>
          <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Remarks</Text><Text style={styles.summaryValue}>{d.overallRemarks}</Text></View>
        </View>

        <View style={styles.footer}>
          <View style={styles.sigBlock}><Text style={styles.sigLine}>Class Teacher</Text></View>
          <View style={styles.sigBlock}><Text style={styles.sigLine}>Principal</Text></View>
        </View>
      </Page>
    </Document>
  );
}

export async function buildReportCard(d: ReportCardData): Promise<Blob> {
  return await pdf(<ReportCard {...d} />).toBlob();
}
