CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $fn$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$fn$;

-- 1. CAREER TRACKS
CREATE TABLE public.career_tracks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title varchar(100) NOT NULL UNIQUE,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.career_tracks TO authenticated;
GRANT ALL ON public.career_tracks TO service_role;
ALTER TABLE public.career_tracks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tracks readable" ON public.career_tracks FOR SELECT TO authenticated USING (true);

-- 2. TRACK TASKS
CREATE TABLE public.track_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id uuid NOT NULL REFERENCES public.career_tracks(id) ON DELETE CASCADE,
  category_id int NOT NULL CHECK (category_id BETWEEN 1 AND 5),
  category_name varchar(100) NOT NULL,
  title varchar(255) NOT NULL,
  description text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.track_tasks(track_id);
GRANT SELECT ON public.track_tasks TO authenticated;
GRANT ALL ON public.track_tasks TO service_role;
ALTER TABLE public.track_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "track tasks readable" ON public.track_tasks FOR SELECT TO authenticated USING (true);

-- 3. USER SELECTED TRACK
CREATE TABLE public.user_selected_tracks (
  user_id uuid PRIMARY KEY,
  track_id uuid NOT NULL REFERENCES public.career_tracks(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_selected_tracks TO authenticated;
GRANT ALL ON public.user_selected_tracks TO service_role;
ALTER TABLE public.user_selected_tracks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "selected track readable" ON public.user_selected_tracks FOR SELECT TO authenticated USING (true);
CREATE POLICY "selected track own write" ON public.user_selected_tracks FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 4. USER CAREER PROGRESS
CREATE TABLE public.user_career_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  task_id uuid NOT NULL REFERENCES public.track_tasks(id) ON DELETE CASCADE,
  is_completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, task_id)
);
CREATE INDEX ON public.user_career_progress(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_career_progress TO authenticated;
GRANT ALL ON public.user_career_progress TO service_role;
ALTER TABLE public.user_career_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "career progress readable" ON public.user_career_progress FOR SELECT TO authenticated USING (true);
CREATE POLICY "career progress own write" ON public.user_career_progress FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 5. TRACK REQUESTS
CREATE TABLE public.track_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  requested_role_name varchar(255) NOT NULL,
  status varchar(50) NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.track_requests TO authenticated;
GRANT ALL ON public.track_requests TO service_role;
ALTER TABLE public.track_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "requests own or admin read" ON public.track_requests FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "requests own insert" ON public.track_requests FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "requests admin update" ON public.track_requests FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "requests admin delete" ON public.track_requests FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- updated_at triggers
CREATE TRIGGER trg_ust_updated BEFORE UPDATE ON public.user_selected_tracks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_ucp_updated BEFORE UPDATE ON public.user_career_progress
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_treq_updated BEFORE UPDATE ON public.track_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Career completion percentage per user (weights 20/30/25/10/15)
CREATE OR REPLACE FUNCTION public.career_leaderboard()
RETURNS TABLE (user_id uuid, track_id uuid, track_title text, percent numeric)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH weights(category_id, w) AS (
    VALUES (1, 20.0), (2, 30.0), (3, 25.0), (4, 10.0), (5, 15.0)
  ),
  totals AS (
    SELECT t.track_id, t.category_id, count(*)::numeric AS n
    FROM public.track_tasks t GROUP BY 1, 2
  ),
  done AS (
    SELECT s.user_id, t.track_id, t.category_id, count(*)::numeric AS k
    FROM public.user_selected_tracks s
    JOIN public.track_tasks t ON t.track_id = s.track_id
    JOIN public.user_career_progress p
      ON p.task_id = t.id AND p.user_id = s.user_id AND p.is_completed
    GROUP BY 1, 2, 3
  )
  SELECT s.user_id,
         s.track_id,
         ct.title::text,
         COALESCE(SUM(w.w * d.k / NULLIF(tot.n, 0)), 0)::numeric AS percent
  FROM public.user_selected_tracks s
  JOIN public.career_tracks ct ON ct.id = s.track_id
  CROSS JOIN weights w
  LEFT JOIN totals tot ON tot.track_id = s.track_id AND tot.category_id = w.category_id
  LEFT JOIN done d ON d.user_id = s.user_id AND d.track_id = s.track_id AND d.category_id = w.category_id
  GROUP BY s.user_id, s.track_id, ct.title;
$$;
GRANT EXECUTE ON FUNCTION public.career_leaderboard() TO authenticated;

-- ============ SEED: MLOps Engineer ============
INSERT INTO public.career_tracks (id, title, description) VALUES
  ('11111111-1111-4111-8111-111111111111', 'MLOps Engineer', 'Ship, scale and monitor machine learning systems in production.'),
  ('22222222-2222-4222-8222-222222222222', 'Cybersecurity Engineer', 'Defend, detect and attack: from networking fundamentals to red/blue team operations.');

INSERT INTO public.track_tasks (track_id, category_id, category_name, title, description, sort_order) VALUES
-- MLOps C1
('11111111-1111-4111-8111-111111111111',1,'Core Fundamentals','Programming Fundamentals & Tooling','Python mastery, Go basics, virtual environments (venv, conda), packaging (Poetry), testing (pytest), code formatting (black, flake8), and command-line editors (Vim, Nano).',1),
('11111111-1111-4111-8111-111111111111',1,'Core Fundamentals','Shell & Command Line Administration','Bash scripting, file manipulation, environment variables, Linux system administration, and SSH configuration.',2),
('11111111-1111-4111-8111-111111111111',1,'Core Fundamentals','Version Control Systems & Workflows','Git branching strategies, pull requests, merge conflict resolution, and GitHub/GitLab actions integration.',3),
('11111111-1111-4111-8111-111111111111',1,'Core Fundamentals','Data Structures, Algorithms & Mathematics','Linear algebra, probability distributions, matrix operations, statistical testing, and 150+ LeetCode problems (Arrays, Trees, Graphs, DP).',4),
('11111111-1111-4111-8111-111111111111',1,'Core Fundamentals','Databases & Storage Foundations','Schema design, SQL query optimization in PostgreSQL, NoSQL databases, and Redis caching architectures.',5),
-- MLOps C2
('11111111-1111-4111-8111-111111111111',2,'Domain Skills','Machine Learning Core & Evaluation','Feature engineering, cross-validation, hyperparameter tuning, metrics (RMSE, Precision/Recall, ROC-AUC), and Scikit-Learn pipelines.',1),
('11111111-1111-4111-8111-111111111111',2,'Domain Skills','Deep Learning Frameworks','Neural network architectures, model training, and fine-tuning pipelines using PyTorch or TensorFlow.',2),
('11111111-1111-4111-8111-111111111111',2,'Domain Skills','Data Engineering & Streaming Architecture','Data Lakes & Warehouses, batch vs. streaming data ingestion, Apache Spark, Apache Kafka, and Apache Flink.',3),
('11111111-1111-4111-8111-111111111111',2,'Domain Skills','Containerization & Cloud Infrastructure','Multi-stage Docker builds, container security, Docker Compose, and cloud-native ML services on AWS, GCP, or Azure.',4),
('11111111-1111-4111-8111-111111111111',2,'Domain Skills','Model Serving APIs & Kubernetes','Asynchronous low-latency inference endpoints with FastAPI, gRPC, KServe, Triton Inference Server, TorchServe, and Kubernetes orchestration (Pods, Deployments, Services, Ingress, Helm).',5),
-- MLOps C3
('11111111-1111-4111-8111-111111111111',3,'Production Projects','Pipeline Orchestration','Build, schedule, and monitor DAG-based workflows using Apache Airflow, Prefect, Kubeflow pipelines, or Flyte.',1),
('11111111-1111-4111-8111-111111111111',3,'Production Projects','CI/CD & Automation for ML','Automated testing, linting, continuous training (CML), and deployment pipelines using GitHub Actions, Jenkins, or GitLab CI.',2),
('11111111-1111-4111-8111-111111111111',3,'Production Projects','Experiment Tracking & Model Registry','Track hyperparameter runs, metrics, and manage versioned model artifacts using MLflow, Weights & Biases (W&B), or Comet ML.',3),
('11111111-1111-4111-8111-111111111111',3,'Production Projects','Data Lineage, Versioning & Feature Stores','Dataset and binary artifact versioning using DVC or LakeFS alongside centralized Feature Stores.',4),
('11111111-1111-4111-8111-111111111111',3,'Production Projects','Observability, Drift & Infrastructure as Code','Prometheus metrics, Grafana dashboards, data/model drift monitoring (Evidently AI), and IaC provisioning with Terraform or Ansible.',5),
-- MLOps C4
('11111111-1111-4111-8111-111111111111',4,'Certifications & Benchmarks','Cloud & Container Certification','Pass Certified Kubernetes Administrator (CKA) or AWS Certified Machine Learning Specialty.',1),
('11111111-1111-4111-8111-111111111111',4,'Certifications & Benchmarks','MLOps System Design Benchmark','Architect fault-tolerant, high-throughput, low-latency production ML systems.',2),
-- MLOps C5
('11111111-1111-4111-8111-111111111111',5,'Real Experience','Monitored Kubernetes Capstone','End-to-end deployment of an ML model on Kubernetes monitored for data drift using Prometheus & Grafana.',1),
('11111111-1111-4111-8111-111111111111',5,'Real Experience','Open-Source Infrastructure Contributions','Contribute bug fixes, features, or documentation to open-source MLOps project repositories.',2),
('11111111-1111-4111-8111-111111111111',5,'Real Experience','Industry Tech Internship','Complete 1+ internship as a Data Engineer, DevOps Engineer, or MLOps Engineer.',3),
-- Cyber C1
('22222222-2222-4222-8222-222222222222',1,'Core Fundamentals','Fundamental IT Skills & OS Administration','Hardware components, connection types, OS-independent troubleshooting, permissions, and CRUD file operations across Windows, Linux (Ubuntu, Debian, RedHat, Kali, ParrotOS), and MacOS via GUI/CLI.',1),
('22222222-2222-4222-8222-222222222222',1,'Core Fundamentals','Computer Networking & Protocols','OSI 7-Layer Model, TCP/IP suite, IPv4/v6 addressing, Subnetting, CIDR, VLAN, DMZ, ARP, DHCP, DNS, NAT, and core protocols (HTTP/HTTPS, SSL/TLS, SSH, RDP, FTP, SFTP, NTP, IPAM).',2),
('22222222-2222-4222-8222-222222222222',1,'Core Fundamentals','Virtualization & Hardware Security','Hypervisor management (VMware, VirtualBox, Proxmox, ESXi), Host/Guest OS setup, wireless security (WPA2/WPA3, NFC, Bluetooth, Infrared), and SAN/NAS storage basics.',3),
('22222222-2222-4222-8222-222222222222',1,'Core Fundamentals','Security Automation & Scripting','Write network scanning, log parsing, and payload automation scripts using Python, Go, Bash, PowerShell, or C++.',4),
('22222222-2222-4222-8222-222222222222',1,'Core Fundamentals','Data Structures & Memory Foundations','Pointers, bitwise operations, memory layout, and 100+ LeetCode problems focused on string manipulation and data structures.',5),
-- Cyber C2
('22222222-2222-4222-8222-222222222222',2,'Domain Skills','Traffic Analysis & Sniffing','Capture and analyze packets using Wireshark, tcpdump, Nmap, dig, nslookup, netstat, hping, and route diagnostic utilities.',1),
('22222222-2222-4222-8222-222222222222',2,'Domain Skills','Web Application Attacks & OWASP Top 10','Identify, exploit, and defend against SQL Injection, Cross-Site Scripting (XSS), CSRF, SSRF, IDOR, Broken Access Control, Buffer Overflows, Memory Leaks, Directory Traversal, and Pass the Hash.',2),
('22222222-2222-4222-8222-222222222222',2,'Domain Skills','Applied Cryptography & Authentication','Symmetric (AES), Asymmetric (RSA/ECC), SHA-256 hashing, salting, PKI certificates, MFA/2FA, Kerberos, RADIUS, LDAP, and SSO protocols.',3),
('22222222-2222-4222-8222-222222222222',2,'Domain Skills','Security Frameworks, Standards & Architecture','Apply CIA Triad, AAA framework, MITRE ATT&CK, Diamond Model, Cyber Kill Chain, NIST, ISO, RMF, CIS CSF, Defense in Depth, and Zero Trust concepts.',4),
('22222222-2222-4222-8222-222222222222',2,'Domain Skills','Cloud Security & Infrastructure','Security across SaaS, PaaS, IaaS, Cloud Models (Public/Private/Hybrid on AWS/GCP/Azure), Infrastructure as Code, Serverless, and Cloud Storage environments.',5),
-- Cyber C3
('22222222-2222-4222-8222-222222222222',3,'Production Projects','SIEM / SOAR & Log Monitoring Lab','Aggregate and analyze Event Logs, Syslogs, Netflow, and Packet Captures to construct threat detection dashboards in Splunk or Elastic SIEM.',1),
('22222222-2222-4222-8222-222222222222',3,'Production Projects','Defensive Control Implementation & Hardening','Configure NextGen Firewalls (pfSense), IDS/IPS (Snort, Suricata), Honeypots, Sinkholes, ACLs, EDR/DLP solutions, Jump Servers, and Operating System Hardening rules.',2),
('22222222-2222-4222-8222-222222222222',3,'Production Projects','Incident Response & Digital Forensics Workflow','Execute the 6-stage Incident Response process (Preparation, Identification, Containment, Eradication, Recovery, Lessons Learned) using Autopsy, FTK Imager, WinHex, and memory dump analyzers.',3),
('22222222-2222-4222-8222-222222222222',3,'Production Projects','Offensive Security & PenTesting Lab','Conduct Rules of Engagement recon using Metasploit, Burp Suite, LOLBAS, GTFOBins, WADComs, and malware analysis sandboxes (VirusTotal, Joe Sandbox, Any.run).',4),
-- Cyber C4
('22222222-2222-4222-8222-222222222222',4,'Certifications & Benchmarks','Beginner / Foundational Certification','Earn CompTIA Security+, CompTIA Network+, CompTIA Linux+, CompTIA A+, or CCNA.',1),
('22222222-2222-4222-8222-222222222222',4,'Certifications & Benchmarks','Advanced Practical Certification','Pass CEH, OSCP, GSEC, GPEN, GWAPT, GIAC, CREST, CISA, CISM, or CISSP.',2),
-- Cyber C5
('22222222-2222-4222-8222-222222222222',5,'Real Experience','CTF Platforms & Competitions','Active challenge completion and machine rooting on HackTheBox, TryHackMe, VulnHub, picoCTF, or SANS Holiday Hack Challenges.',1),
('22222222-2222-4222-8222-222222222222',5,'Real Experience','Vulnerability Research & Bug Bounty','Document CVE discoveries, publish security write-ups, or submit valid vulnerability reports via HackerOne/Bugcrowd.',2),
('22222222-2222-4222-8222-222222222222',5,'Real Experience','Cybersecurity Industry Internship','Complete 1+ internship as a SOC Analyst, Application Security Engineer, or Penetration Tester.',3);