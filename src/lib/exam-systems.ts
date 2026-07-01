export type ExamRegionId =
  | "west_africa"
  | "africa"
  | "international"
  | "university"
  | "professional";

export type ExamSystem = {
  id: string;
  name: string;
  shortName: string;
  region: ExamRegionId;
  countries: string[];
  description: string;
  typicalSubjects: string[];
  format: string;
  scoringNotes: string;
  prepFocus: string[];
};

export const EXAM_REGIONS: { id: ExamRegionId; label: string; description: string }[] = [
  {
    id: "west_africa",
    label: "West Africa",
    description: "WAEC, BECE, JAMB, NABTEB, and regional school-leaving exams",
  },
  {
    id: "africa",
    label: "Africa (pan-regional)",
    description: "KCSE, Matric, UACE, ZIMSEC, and other national systems",
  },
  {
    id: "international",
    label: "International",
    description: "SAT, IELTS, GCSE, IB, AP, and global standardised tests",
  },
  {
    id: "university",
    label: "University & college",
    description: "Finals, midterms, comps, and semester assessments",
  },
  {
    id: "professional",
    label: "Professional & licensure",
    description: "Bar, medical, nursing, accounting, and certification exams",
  },
];

export const EXAM_SYSTEMS: ExamSystem[] = [
  // —— West Africa ——
  {
    id: "wassce",
    name: "WASSCE (West African Senior School Certificate Examination)",
    shortName: "WASSCE",
    region: "west_africa",
    countries: ["Ghana", "Nigeria", "Sierra Leone", "Liberia", "Gambia"],
    description: "Senior high school leaving certificate coordinated by WAEC.",
    typicalSubjects: [
      "Core Mathematics",
      "English Language",
      "Integrated Science",
      "Social Studies",
      "Physics",
      "Chemistry",
      "Biology",
      "Economics",
      "Government",
      "Literature",
      "Geography",
      "Further Mathematics",
    ],
    format: "Objective (Paper 1) + Theory/Essay (Paper 2) + Practical where applicable (Paper 3).",
    scoringNotes: "Grades A1–F9. C6 or better typically required for university entry.",
    prepFocus: ["Past WAEC questions by year", "Objective speed drills", "Essay rubric practice", "Practical lab prep"],
  },
  {
    id: "bece",
    name: "BECE (Basic Education Certificate Examination)",
    shortName: "BECE",
    region: "west_africa",
    countries: ["Ghana", "Nigeria", "Sierra Leone", "Liberia", "Gambia"],
    description: "Junior high / basic education completion exam by WAEC.",
    typicalSubjects: [
      "Mathematics",
      "English",
      "Integrated Science",
      "Social Studies",
      "French",
      "ICT",
      "BDT",
      "RME",
    ],
    format: "Multiple-choice and structured questions across core subjects.",
    scoringNotes: "Aggregate score determines SHS placement (Ghana) or JSS completion.",
    prepFocus: ["BECE past questions", "Core subject fundamentals", "Time management on objective papers"],
  },
  {
    id: "waec-gce",
    name: "WAEC GCE (Private WASSCE)",
    shortName: "WAEC GCE",
    region: "west_africa",
    countries: ["Ghana", "Nigeria", "Sierra Leone", "Liberia"],
    description: "Private candidate version of WASSCE for school leavers and retakers.",
    typicalSubjects: ["Same subject list as WASSCE"],
    format: "Identical paper structure to WASSCE.",
    scoringNotes: "Same grading scale as WASSCE.",
    prepFocus: ["Self-paced syllabus coverage", "Past GCE/WASSCE papers", "Weak subject retakes"],
  },
  {
    id: "nabteb",
    name: "NABTEB (National Business and Technical Examinations Board)",
    shortName: "NABTEB",
    region: "west_africa",
    countries: ["Nigeria"],
    description: "Technical, vocational, and business-oriented secondary certification.",
    typicalSubjects: [
      "Technical Drawing",
      "Building Construction",
      "Electrical Installation",
      "Accounting",
      "Office Practice",
      "Physics",
      "Chemistry",
    ],
    format: "Theory, practical, and trade-related assessments.",
    scoringNotes: "Accepted for polytechnic and some university admissions in Nigeria.",
    prepFocus: ["Trade practicals", "Workshop safety", "Past NABTEB papers"],
  },
  {
    id: "jamb-utme",
    name: "JAMB UTME (Unified Tertiary Matriculation Examination)",
    shortName: "JAMB UTME",
    region: "west_africa",
    countries: ["Nigeria"],
    description: "Computer-based university entrance exam for Nigerian tertiary institutions.",
    typicalSubjects: [
      "Use of English",
      "Mathematics",
      "Physics",
      "Chemistry",
      "Biology",
      "Economics",
      "Government",
      "Literature",
      "Commerce",
      "CRS/IRS",
    ],
    format: "CBT: 180 questions, 60 per subject combination (3 subjects + English).",
    scoringNotes: "Score out of 400. Cut-off varies by institution and course.",
    prepFocus: ["JAMB past questions", "CBT simulation", "Speed and accuracy", "Subject combination alignment"],
  },
  {
    id: "post-utme",
    name: "POST-UTME / University Screening",
    shortName: "POST-UTME",
    region: "west_africa",
    countries: ["Nigeria", "Ghana"],
    description: "Institution-specific screening after UTME or WASSCE.",
    typicalSubjects: ["Varies by university and course"],
    format: "CBT or written test; sometimes oral interview.",
    scoringNotes: "Combined with UTME/WASSCE for admission decision.",
    prepFocus: ["University-specific past questions", "Current affairs", "Course-relevant aptitude"],
  },
  {
    id: "novdec",
    name: "NOVDEC (Private BECE/WASSCE November/December)",
    shortName: "NOVDEC",
    region: "west_africa",
    countries: ["Ghana"],
    description: "Second-chance private sitting for BECE/WASSCE candidates.",
    typicalSubjects: ["Same as BECE or WASSCE depending on level"],
    format: "Mirrors BECE or WASSCE paper structure.",
    scoringNotes: "Same grading as standard WAEC sittings.",
    prepFocus: ["Intensive past-paper sprints", "Gap analysis from prior attempt"],
  },

  // —— Africa (other regions) ——
  {
    id: "kcse",
    name: "KCSE (Kenya Certificate of Secondary Education)",
    shortName: "KCSE",
    region: "africa",
    countries: ["Kenya"],
    description: "Kenyan secondary school leaving examination.",
    typicalSubjects: [
      "Mathematics",
      "English",
      "Kiswahili",
      "Biology",
      "Chemistry",
      "Physics",
      "History",
      "Geography",
      "Business Studies",
      "Agriculture",
    ],
    format: "Structured papers with essays, short answers, and practicals.",
    scoringNotes: "Mean grade (A–E) and cluster points for university placement.",
    prepFocus: ["KNEC past papers", "Practical specimens", "Essay planning under time pressure"],
  },
  {
    id: "kcpe",
    name: "KPSEA / Primary Exit (formerly KCPE track)",
    shortName: "Primary Exit",
    region: "africa",
    countries: ["Kenya"],
    description: "Primary-to-secondary transition assessment in Kenya.",
    typicalSubjects: ["Mathematics", "English", "Kiswahili", "Science", "Social Studies"],
    format: "Standardised multiple subjects in primary cycle.",
    scoringNotes: "Determines junior secondary placement.",
    prepFocus: ["Foundation drills", "Past papers", "Reading comprehension"],
  },
  {
    id: "nsc-matric",
    name: "NSC Matric (National Senior Certificate)",
    shortName: "Matric",
    region: "africa",
    countries: ["South Africa"],
    description: "South African matriculation / Grade 12 exit exam.",
    typicalSubjects: [
      "Mathematics / Maths Literacy",
      "Physical Sciences",
      "Life Sciences",
      "English",
      "Afrikaans",
      "Accounting",
      "History",
      "Geography",
    ],
    format: "CAPS-aligned papers; Paper 1 and Paper 2 per subject.",
    scoringNotes: "Bachelor's pass, diploma pass, or higher certificate pass levels.",
    prepFocus: ["DBE past papers", "IEB variants if applicable", "SBA consolidation"],
  },
  {
    id: "uace",
    name: "UACE (Uganda Advanced Certificate of Education)",
    shortName: "UACE",
    region: "africa",
    countries: ["Uganda"],
    description: "Ugandan A-Level equivalent for university entry.",
    typicalSubjects: ["Physics", "Chemistry", "Biology", "Mathematics", "Economics", "History", "Literature"],
    format: "Advanced level papers with practical components.",
    scoringNotes: "Points system for university admission (Makerere, etc.).",
    prepFocus: ["UNEB past papers", "Practical exams", "Subsidiary ICT/General Paper"],
  },
  {
    id: "zimsec",
    name: "ZIMSEC O-Level / A-Level",
    shortName: "ZIMSEC",
    region: "africa",
    countries: ["Zimbabwe"],
    description: "Zimbabwe school examinations at O and A level.",
    typicalSubjects: ["Sciences", "Commercials", "Arts", "Practical subjects"],
    format: "Cambridge-influenced structure with local syllabus.",
    scoringNotes: "Grades for O-Level completion and A-Level university entry.",
    prepFocus: ["ZIMSEC past examinations", "Specimen papers"],
  },
  {
    id: "egsece",
    name: "EGSECE (Ethiopian General Secondary Education Certificate)",
    shortName: "EGSECE",
    region: "africa",
    countries: ["Ethiopia"],
    description: "Ethiopian secondary leaving examination.",
    typicalSubjects: ["Natural Science stream", "Social Science stream subjects"],
    format: "National exam after Grade 12.",
    scoringNotes: "Cut-off for Ethiopian universities.",
    prepFocus: ["Stream-specific past papers", "Amharic/English bilingual prep"],
  },

  // —— International ——
  {
    id: "sat",
    name: "SAT (Scholastic Assessment Test)",
    shortName: "SAT",
    region: "international",
    countries: ["USA", "Global"],
    description: "US college admissions test (Digital SAT).",
    typicalSubjects: ["Reading & Writing", "Math"],
    format: "Adaptive digital test; two modules per section.",
    scoringNotes: "Total 400–1600. Superscoring accepted by many colleges.",
    prepFocus: ["Bluebook practice tests", "Desmos calculator mastery", "Grammar and evidence-based reading"],
  },
  {
    id: "act",
    name: "ACT",
    shortName: "ACT",
    region: "international",
    countries: ["USA", "Global"],
    description: "US college readiness assessment.",
    typicalSubjects: ["English", "Math", "Reading", "Science", "Writing (optional)"],
    format: "Multiple-choice with optional essay.",
    scoringNotes: "Composite 1–36.",
    prepFocus: ["Official ACT prep", "Science reasoning speed", "Time pacing"],
  },
  {
    id: "ielts",
    name: "IELTS (International English Language Testing System)",
    shortName: "IELTS",
    region: "international",
    countries: ["Global"],
    description: "English proficiency for study, work, and migration.",
    typicalSubjects: ["Listening", "Reading", "Writing", "Speaking"],
    format: "Academic or General Training modules; band score 0–9.",
    scoringNotes: "Most universities require 6.0–7.5 overall.",
    prepFocus: ["Timed writing Task 1/2 templates", "Speaking cue cards", "Listening accents"],
  },
  {
    id: "toefl",
    name: "TOEFL iBT",
    shortName: "TOEFL",
    region: "international",
    countries: ["Global"],
    description: "English proficiency for North American and global institutions.",
    typicalSubjects: ["Reading", "Listening", "Speaking", "Writing"],
    format: "Internet-based test; score 0–120.",
    scoringNotes: "Typical minimum 80–100 for universities.",
    prepFocus: ["Integrated tasks practice", "Note-taking", "Academic vocabulary"],
  },
  {
    id: "gcse",
    name: "GCSE (General Certificate of Secondary Education)",
    shortName: "GCSE",
    region: "international",
    countries: ["UK", "International schools"],
    description: "UK secondary qualifications (AQA, Edexcel, OCR).",
    typicalSubjects: ["Maths", "English Language", "Sciences", "Humanities", "MFL"],
    format: "Tiered papers (Foundation/Higher); grades 9–1.",
    scoringNotes: "Grade 4 = standard pass; Grade 7+ for competitive A-Level routes.",
    prepFocus: ["Specification-aligned revision", "Past paper mark schemes", "Required practicals (science)"],
  },
  {
    id: "a-levels",
    name: "A-Levels (GCE Advanced Level)",
    shortName: "A-Levels",
    region: "international",
    countries: ["UK", "International schools"],
    description: "Pre-university qualification in UK and Commonwealth schools.",
    typicalSubjects: ["3–4 subjects typically chosen for degree path"],
    format: "AS and A2 papers; A*–E grading.",
    scoringNotes: "Predicted grades used for UCAS; final grades for offers.",
    prepFocus: ["Specimen papers", "Essay depth", "Synoptic assessment prep"],
  },
  {
    id: "ib",
    name: "IB Diploma (International Baccalaureate)",
    shortName: "IB",
    region: "international",
    countries: ["Global"],
    description: "Two-year diploma programme with HL/SL subjects and core components.",
    typicalSubjects: ["6 subjects + TOK + EE + CAS"],
    format: "External exams in May/November; IA coursework counts.",
    scoringNotes: "45 points maximum; 24+ for diploma award.",
    prepFocus: ["IA completion", "Past IB papers", "Extended Essay milestones", "TOK essay/presentation"],
  },
  {
    id: "ap",
    name: "AP Exams (Advanced Placement)",
    shortName: "AP",
    region: "international",
    countries: ["USA", "Global"],
    description: "College-level courses and exams in US high schools.",
    typicalSubjects: ["Calculus AB/BC", "Physics", "Chemistry", "Biology", "History", "CS A", "Statistics"],
    format: "May exams; mix of MCQ and FRQ.",
    scoringNotes: "Scores 1–5; many colleges grant credit for 4 or 5.",
    prepFocus: ["College Board FRQ rubrics", "Released exams", "Cumulative review"],
  },
  {
    id: "gre",
    name: "GRE General Test",
    shortName: "GRE",
    region: "international",
    countries: ["Global"],
    description: "Graduate school admissions test.",
    typicalSubjects: ["Verbal Reasoning", "Quantitative Reasoning", "Analytical Writing"],
    format: "Computer-adaptive; section timing strict.",
    scoringNotes: "Verbal and Quant 130–170 each.",
    prepFocus: ["Official ETS materials", "Vocabulary", "Quantitative comparison drills"],
  },

  // —— University ——
  {
    id: "university-finals",
    name: "University Final Examinations",
    shortName: "Uni Finals",
    region: "university",
    countries: ["Global"],
    description: "End-of-semester or end-of-programme comprehensive exams.",
    typicalSubjects: ["Course-specific"],
    format: "Essays, problem sets, open/closed book, take-home, or oral exams.",
    scoringNotes: "Varies by institution; often 40–70% of course grade.",
    prepFocus: ["Lecture consolidation", "Past exam papers from course", "Study groups", "Office hours"],
  },
  {
    id: "university-midterm",
    name: "Midterm / Continuous Assessment",
    shortName: "Midterms",
    region: "university",
    countries: ["Global"],
    description: "In-semester major assessments and CA components.",
    typicalSubjects: ["Course modules"],
    format: "MCQ, short answer, lab reports, projects.",
    scoringNotes: "Often 20–40% of final grade.",
    prepFocus: ["Weekly review", "Tutorial problems", "CA rubrics"],
  },
  {
    id: "comprehensive-exam",
    name: "Comprehensive / Qualifying Exam",
    shortName: "Comps / Quals",
    region: "university",
    countries: ["Global"],
    description: "Programme-wide qualifying or comprehensive examination.",
    typicalSubjects: ["Core discipline breadth"],
    format: "Written and/or oral over multiple days.",
    scoringNotes: "Pass/fail or graded; required for candidacy.",
    prepFocus: ["Reading lists", "Field summaries", "Mock orals"],
  },

  // —— Professional ——
  {
    id: "bar-exam",
    name: "Bar Examination",
    shortName: "Bar Exam",
    region: "professional",
    countries: ["USA", "UK", "Ghana", "Nigeria", "Kenya"],
    description: "Legal licensure examination.",
    typicalSubjects: ["Constitutional law", "Contracts", "Torts", "Criminal law", "Evidence", "Ethics"],
    format: "Jurisdiction-specific (MBE, MEE, MPT in US; Ghana School of Law entrance, etc.).",
    scoringNotes: "Pass required for legal practice.",
    prepFocus: ["Bar prep courses", "Essay writing under time", "Rule memorisation"],
  },
  {
    id: "medical-licensing",
    name: "Medical Licensing (USMLE / PLAB / Ghana Medical & Dental Council)",
    shortName: "Medical Licensing",
    region: "professional",
    countries: ["Global"],
    description: "Physician licensure and board examinations.",
    typicalSubjects: ["Basic sciences", "Clinical knowledge", "OSCE skills"],
    format: "Step 1/2/3 (USMLE), PLAB (UK), local council exams.",
    scoringNotes: "Sequential steps; clinical skills separately assessed.",
    prepFocus: ["Question banks", "Clinical vignettes", "OSCE practice"],
  },
  {
    id: "nursing-licensure",
    name: "Nursing Licensure (NCLEX / NMCN)",
    shortName: "Nursing NCLEX",
    region: "professional",
    countries: ["USA", "Nigeria", "Global"],
    description: "Registered nurse licensure examination.",
    typicalSubjects: ["Pharmacology", "Med-surg", "Paediatrics", "Maternity", "Psychiatric nursing"],
    format: "Computer-adaptive NCLEX-RN or national nursing council exam.",
    scoringNotes: "Pass/fail; CAT format for NCLEX.",
    prepFocus: ["UWorld-style questions", "Priority and delegation", "Safety protocols"],
  },
  {
    id: "accounting-professional",
    name: "Professional Accounting (ACCA / ICAN / CPA)",
    shortName: "ACCA / ICAN / CPA",
    region: "professional",
    countries: ["Global", "Nigeria", "Ghana", "UK"],
    description: "Chartered and certified public accounting qualifications.",
    typicalSubjects: ["Financial reporting", "Audit", "Taxation", "Management accounting", "Ethics"],
    format: "Multi-paper modular exams.",
    scoringNotes: "Professional body specific pass marks.",
    prepFocus: ["Past exam kits", "Technical articles", "Exam technique for long questions"],
  },
  {
    id: "teaching-licensure",
    name: "Teaching Licensure (NTE / GTLE / Praxis)",
    shortName: "Teaching License",
    region: "professional",
    countries: ["Ghana", "Nigeria", "USA"],
    description: "Teacher registration and licensure tests.",
    typicalSubjects: ["Pedagogy", "Literacy", "Numeracy", "Specialism"],
    format: "NTE (Nigeria), GTLE (Ghana), Praxis (US), etc.",
    scoringNotes: "Required for public school employment.",
    prepFocus: ["Curriculum standards", "Sample tests", "Lesson planning under rubric"],
  },
];

export function getExamSystem(id: string): ExamSystem | undefined {
  return EXAM_SYSTEMS.find((e) => e.id === id);
}

export function getExamSystemsByRegion(region: ExamRegionId): ExamSystem[] {
  return EXAM_SYSTEMS.filter((e) => e.region === region);
}

export function searchExamSystems(query: string): ExamSystem[] {
  const q = query.trim().toLowerCase();
  if (!q) return EXAM_SYSTEMS;
  return EXAM_SYSTEMS.filter(
    (e) =>
      e.name.toLowerCase().includes(q) ||
      e.shortName.toLowerCase().includes(q) ||
      e.countries.some((c) => c.toLowerCase().includes(q)) ||
      e.typicalSubjects.some((s) => s.toLowerCase().includes(q))
  );
}

export function buildExamSystemContext(systemId: string, subject: string): string {
  const system = getExamSystem(systemId);
  if (!system) {
    return `Exam system: Custom / ${subject || "General"}`;
  }
  return [
    `Exam system: ${system.name} (${system.shortName})`,
    `Region: ${system.region.replace("_", " ")}`,
    `Countries: ${system.countries.join(", ")}`,
    `Format: ${system.format}`,
    `Scoring: ${system.scoringNotes}`,
    `Prep focus for this system: ${system.prepFocus.join("; ")}`,
    `Student subject focus: ${subject || "General"}`,
  ].join("\n");
}
