import { Document, Page, Text, View, StyleSheet, pdf } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { padding: 36, fontFamily: "Helvetica", fontSize: 10, color: "#1a1f33" },
  schoolHeader: { textAlign: "center", marginBottom: 14, borderBottom: "2 solid #312e81", paddingBottom: 10 },
  schoolName: { fontSize: 18, fontWeight: 700, color: "#312e81", letterSpacing: 1 },
  title: { fontSize: 12, fontWeight: 700, marginTop: 8, textTransform: "uppercase", letterSpacing: 1.2 },
  meta: { marginBottom: 12, fontSize: 10, color: "#475569" },
  section: { fontSize: 11, fontWeight: 700, marginTop: 14, marginBottom: 6, color: "#312e81" },
  table: { borderTop: "1 solid #e2e8f0", borderLeft: "1 solid #e2e8f0" },
  row: { flexDirection: "row", borderBottom: "1 solid #e2e8f0" },
  head: { backgroundColor: "#312e81" },
  th: { padding: 6, fontSize: 9, fontWeight: 700, color: "#fff", borderRight: "1 solid #e2e8f0" },
  td: { padding: 6, fontSize: 9, borderRight: "1 solid #e2e8f0" },
});

export type ClassReportData = {
  stream: { name: string } | null;
  term: { name: string; year: number } | null;
  ranked: Array<{ student: { full_name: string; admission_number: string }; total: number; avg: number; position: number }>;
  subjectStats: Array<{ subject: { name: string; code: string }; average: number; highest: number; lowest: number; entries: number }>;
};

function ClassReport(d: ClassReportData) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.schoolHeader}>
          <Text style={styles.schoolName}>IKONEX ACADEMY</Text>
          <Text style={styles.title}>Class Performance Report</Text>
        </View>
        <Text style={styles.meta}>Stream: {d.stream?.name ?? "—"}    |    Term: {d.term ? `${d.term.name} ${d.term.year}` : "—"}    |    Students: {d.ranked.length}</Text>

        <Text style={styles.section}>Subject Statistics</Text>
        <View style={styles.table}>
          <View style={[styles.row, styles.head]}>
            <Text style={[styles.th, { flex: 3 }]}>Subject</Text>
            <Text style={[styles.th, { flex: 1, textAlign: "right" }]}>Average</Text>
            <Text style={[styles.th, { flex: 1, textAlign: "right" }]}>Highest</Text>
            <Text style={[styles.th, { flex: 1, textAlign: "right" }]}>Lowest</Text>
            <Text style={[styles.th, { flex: 1, textAlign: "right" }]}>Entries</Text>
          </View>
          {d.subjectStats.map((s, i) => (
            <View key={i} style={styles.row}>
              <Text style={[styles.td, { flex: 3 }]}>{s.subject.name} ({s.subject.code})</Text>
              <Text style={[styles.td, { flex: 1, textAlign: "right" }]}>{s.average.toFixed(2)}</Text>
              <Text style={[styles.td, { flex: 1, textAlign: "right" }]}>{s.highest.toFixed(2)}</Text>
              <Text style={[styles.td, { flex: 1, textAlign: "right" }]}>{s.lowest.toFixed(2)}</Text>
              <Text style={[styles.td, { flex: 1, textAlign: "right" }]}>{s.entries}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.section}>Overall Class Ranking</Text>
        <View style={styles.table}>
          <View style={[styles.row, styles.head]}>
            <Text style={[styles.th, { flex: 0.6 }]}>Pos</Text>
            <Text style={[styles.th, { flex: 3 }]}>Student</Text>
            <Text style={[styles.th, { flex: 1.2 }]}>Adm. No.</Text>
            <Text style={[styles.th, { flex: 1, textAlign: "right" }]}>Total</Text>
            <Text style={[styles.th, { flex: 1, textAlign: "right" }]}>Average</Text>
          </View>
          {d.ranked.map((r, i) => (
            <View key={i} style={styles.row}>
              <Text style={[styles.td, { flex: 0.6 }]}>{r.position}</Text>
              <Text style={[styles.td, { flex: 3 }]}>{r.student.full_name}</Text>
              <Text style={[styles.td, { flex: 1.2 }]}>{r.student.admission_number}</Text>
              <Text style={[styles.td, { flex: 1, textAlign: "right" }]}>{r.total.toFixed(2)}</Text>
              <Text style={[styles.td, { flex: 1, textAlign: "right" }]}>{r.avg.toFixed(2)}</Text>
            </View>
          ))}
        </View>
      </Page>
    </Document>
  );
}

export async function buildClassReport(d: ClassReportData): Promise<Blob> {
  return await pdf(<ClassReport {...d} />).toBlob();
}
