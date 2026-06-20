"use client";

import { useState } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Snackbar,
  Alert,
  CircularProgress,
  useTheme,
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import SearchIcon from "@mui/icons-material/Search";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { useI18n } from "@/lib/i18n";
import { alpha } from "@mui/material";

const RECORD_TYPES = [
  "A",
  "AAAA",
  "CNAME",
  "MX",
  "TXT",
  "NS",
  "SOA",
  "SRV",
  "CAA",
  "PTR",
  "NAPTR",
  "DS",
  "DNSKEY",
  "TLSA",
  "SSHFP",
  "HTTPS",
  "SVCB",
] as const;

const COMMON_TYPES = ["A", "AAAA", "CNAME", "MX", "TXT", "NS"];

interface DnsRecord {
  name: string;
  type: string;
  TTL: number;
  data: string;
}

interface ApiResponse {
  domain?: string;
  type?: string;
  Answer?: DnsRecord[];
  Authority?: DnsRecord[];
  Additional?: DnsRecord[];
  comment?: string;
  error?: string;
}

function getRecordTypeLabel(type: string, t: Record<string, string>) {
  return t[type] || type;
}

export default function DnsClient() {
  const { t } = useI18n();
  const theme = useTheme();

  const [domain, setDomain] = useState("");
  const [recordType, setRecordType] = useState<string>("A");
  const [results, setResults] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState({ open: false, message: "" });

  const handleLookup = async () => {
    const trimmed = domain.trim();
    if (!trimmed) return;

    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const url = `/api/dns?domain=${encodeURIComponent(trimmed)}&type=${recordType}`;
      const res = await fetch(url);

      const data: ApiResponse = await res.json();

      if (!res.ok) {
        setError(data.error || `HTTP ${res.status}`);
        return;
      }

      if (data.error) {
        setError(data.error);
        return;
      }

      if (
        !data.Answer?.length &&
        !data.Authority?.length &&
        !data.Additional?.length
      ) {
        setError(data.comment || t.tools.dns.noRecords);
        setResults(data);
        return;
      }

      setResults(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t.tools.dns.lookupFailed
      );
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && domain.trim() && !loading) {
      handleLookup();
    }
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setToast({ open: true, message: t.tools.dns.copied });
    } catch {
      setToast({ open: true, message: "Failed to copy" });
    }
  };

  const handleCopyAll = async () => {
    if (!results?.Answer?.length) return;
    const text = results.Answer.map(
      (r) => `${r.name}\t${r.TTL}\tIN\t${r.type}\t${r.data}`
    ).join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setToast({ open: true, message: t.tools.dns.copied });
    } catch {
      setToast({ open: true, message: "Failed to copy" });
    }
  };

  const allRecords = [
    ...(results?.Answer || []),
    ...(results?.Authority || []),
    ...(results?.Additional || []),
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <Box
        component="main"
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          px: 3,
          py: 8,
        }}
      >
        <Box sx={{ width: "100%", maxWidth: 860 }}>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 700,
              textAlign: "center",
              mb: 1,
              fontFamily: "var(--font-inter)",
            }}
          >
            {t.tools.dns.title}
          </Typography>
          <Typography
            variant="body2"
            sx={{
              textAlign: "center",
              color: "text.secondary",
              mb: 4,
            }}
          >
            {t.tools.dns.description}
          </Typography>

          {/* Input Row */}
          <Box
            sx={{
              display: "flex",
              gap: 2,
              mb: 1,
              flexWrap: "wrap",
            }}
          >
            <TextField
              fullWidth
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t.tools.dns.placeholder}
              slotProps={{
                input: {
                  sx: {
                    borderRadius: 2,
                    fontFamily: "var(--font-jetbrains-mono), monospace",
                    fontSize: "0.9rem",
                    flex: 1,
                  },
                },
              }}
              sx={{ flex: 3, minWidth: 240 }}
            />
            <FormControl sx={{ flex: 1, minWidth: 120 }}>
              <InputLabel id="record-type-label">
                {t.tools.dns.recordType}
              </InputLabel>
              <Select
                labelId="record-type-label"
                value={recordType}
                label={t.tools.dns.recordType}
                onChange={(e) => setRecordType(e.target.value)}
                sx={{ borderRadius: 2 }}
              >
                {RECORD_TYPES.map((type) => (
                  <MenuItem key={type} value={type}>
                    {getRecordTypeLabel(type, t.tools.dns.recordTypes)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button
              variant="contained"
              onClick={handleLookup}
              disabled={!domain.trim() || loading}
              startIcon={
                loading ? (
                  <CircularProgress size={18} color="inherit" />
                ) : (
                  <SearchIcon />
                )
              }
              sx={{
                px: 4,
                py: 1.5,
                borderRadius: 2,
                textTransform: "none",
                fontWeight: 600,
                fontSize: "0.95rem",
                minWidth: 140,
                flex: { xs: "1 1 100%", sm: "0 0 auto" },
              }}
            >
              {loading ? t.tools.dns.lookingUp : t.tools.dns.lookup}
            </Button>
          </Box>

          {/* Quick Type Chips */}
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 3 }}>
            {COMMON_TYPES.map((type) => (
              <Chip
                key={type}
                label={type}
                size="small"
                variant={recordType === type ? "filled" : "outlined"}
                color={recordType === type ? "primary" : "default"}
                onClick={() => setRecordType(type)}
                sx={{
                  cursor: "pointer",
                  fontFamily: "var(--font-jetbrains-mono), monospace",
                  fontWeight: 600,
                  borderRadius: 1.5,
                  borderColor:
                    recordType !== type ? "divider" : undefined,
                }}
              />
            ))}
          </Box>

          {/* Error */}
          {error && (
            <Alert
              severity={results ? "warning" : "error"}
              sx={{ mb: 3, borderRadius: 2 }}
              onClose={() => setError(null)}
            >
              {error}
            </Alert>
          )}

          {/* Results */}
          {allRecords.length > 0 && (
            <TableContainer
              component={Paper}
              elevation={0}
              sx={{
                border: 1,
                borderColor: "divider",
                borderRadius: 2,
                overflow: "hidden",
                mb: 3,
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  px: 2,
                  py: 1.5,
                  bgcolor: alpha(theme.palette.primary.main, 0.04),
                  borderBottom: 1,
                  borderColor: "divider",
                }}
              >
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  {t.tools.dns.results}{" "}
                  <Chip
                    label={`${results?.Answer?.length || 0}`}
                    size="small"
                    color="primary"
                    sx={{ ml: 1, fontWeight: 700 }}
                  />
                </Typography>
                {results?.Answer?.length ? (
                  <Button
                    size="small"
                    startIcon={<ContentCopyIcon sx={{ fontSize: 16 }} />}
                    onClick={handleCopyAll}
                    sx={{ textTransform: "none", borderRadius: 1.5 }}
                  >
                    {t.tools.dns.copyAll}
                  </Button>
                ) : null}
              </Box>
              <Table size="small">
                <TableHead>
                  <TableRow
                    sx={{
                      bgcolor: alpha(theme.palette.action.hover, 0.04),
                    }}
                  >
                    <TableCell
                      sx={{ fontWeight: 700, minWidth: 100 }}
                    >
                      {t.tools.dns.section}
                    </TableCell>
                    <TableCell
                      sx={{
                        fontWeight: 700,
                        fontFamily:
                          "var(--font-jetbrains-mono), monospace",
                      }}
                    >
                      NAME
                    </TableCell>
                    <TableCell
                      sx={{
                        fontWeight: 700,
                        fontFamily:
                          "var(--font-jetbrains-mono), monospace",
                      }}
                    >
                      TYPE
                    </TableCell>
                    <TableCell
                      sx={{
                        fontWeight: 700,
                        fontFamily:
                          "var(--font-jetbrains-mono), monospace",
                      }}
                    >
                      TTL
                    </TableCell>
                    <TableCell
                      sx={{
                        fontWeight: 700,
                        fontFamily:
                          "var(--font-jetbrains-mono), monospace",
                      }}
                    >
                      DATA
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, width: 48 }} />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {results?.Answer?.map((record, idx) => (
                    <TableRow
                      key={`answer-${idx}`}
                      sx={{
                        "&:last-child td": { border: 0 },
                        ...(idx % 2 === 0
                          ? {
                              bgcolor: alpha(
                                theme.palette.action.hover,
                                0.02
                              ),
                            }
                          : {}),
                      }}
                    >
                      <TableCell>
                        <Chip
                          label={t.tools.dns.answer}
                          size="small"
                          color="success"
                          variant="outlined"
                          sx={{ fontWeight: 600 }}
                        />
                      </TableCell>
                      <TableCell
                        sx={{
                          fontFamily:
                            "var(--font-jetbrains-mono), monospace",
                          fontSize: "0.85rem",
                          wordBreak: "break-all",
                        }}
                      >
                        {record.name}
                      </TableCell>
                      <TableCell
                        sx={{
                          fontFamily:
                            "var(--font-jetbrains-mono), monospace",
                          fontSize: "0.85rem",
                        }}
                      >
                        {record.type}
                      </TableCell>
                      <TableCell
                        sx={{
                          fontFamily:
                            "var(--font-jetbrains-mono), monospace",
                          fontSize: "0.85rem",
                        }}
                      >
                        {record.TTL}
                      </TableCell>
                      <TableCell
                        sx={{
                          fontFamily:
                            "var(--font-jetbrains-mono), monospace",
                          fontSize: "0.85rem",
                          wordBreak: "break-all",
                          maxWidth: 360,
                        }}
                      >
                        {record.data}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="small"
                          onClick={() => handleCopy(record.data)}
                          sx={{
                            minWidth: 36,
                            p: 0.5,
                            borderRadius: 1,
                          }}
                        >
                          <ContentCopyIcon sx={{ fontSize: 14 }} />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {results?.Authority?.map((record, idx) => (
                    <TableRow
                      key={`auth-${idx}`}
                      sx={{
                        "&:last-child td": { border: 0 },
                      }}
                    >
                      <TableCell>
                        <Chip
                          label={t.tools.dns.authority}
                          size="small"
                          color="warning"
                          variant="outlined"
                          sx={{ fontWeight: 600 }}
                        />
                      </TableCell>
                      <TableCell
                        sx={{
                          fontFamily:
                            "var(--font-jetbrains-mono), monospace",
                          fontSize: "0.85rem",
                          wordBreak: "break-all",
                        }}
                      >
                        {record.name}
                      </TableCell>
                      <TableCell
                        sx={{
                          fontFamily:
                            "var(--font-jetbrains-mono), monospace",
                          fontSize: "0.85rem",
                        }}
                      >
                        {record.type}
                      </TableCell>
                      <TableCell
                        sx={{
                          fontFamily:
                            "var(--font-jetbrains-mono), monospace",
                          fontSize: "0.85rem",
                        }}
                      >
                        {record.TTL}
                      </TableCell>
                      <TableCell
                        sx={{
                          fontFamily:
                            "var(--font-jetbrains-mono), monospace",
                          fontSize: "0.85rem",
                          wordBreak: "break-all",
                          maxWidth: 360,
                        }}
                      >
                        {record.data}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="small"
                          onClick={() => handleCopy(record.data)}
                          sx={{
                            minWidth: 36,
                            p: 0.5,
                            borderRadius: 1,
                          }}
                        >
                          <ContentCopyIcon sx={{ fontSize: 14 }} />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {results?.Additional?.map((record, idx) => (
                    <TableRow
                      key={`add-${idx}`}
                      sx={{
                        "&:last-child td": { border: 0 },
                      }}
                    >
                      <TableCell>
                        <Chip
                          label={t.tools.dns.additional}
                          size="small"
                          color="info"
                          variant="outlined"
                          sx={{ fontWeight: 600 }}
                        />
                      </TableCell>
                      <TableCell
                        sx={{
                          fontFamily:
                            "var(--font-jetbrains-mono), monospace",
                          fontSize: "0.85rem",
                          wordBreak: "break-all",
                        }}
                      >
                        {record.name}
                      </TableCell>
                      <TableCell
                        sx={{
                          fontFamily:
                            "var(--font-jetbrains-mono), monospace",
                          fontSize: "0.85rem",
                        }}
                      >
                        {record.type}
                      </TableCell>
                      <TableCell
                        sx={{
                          fontFamily:
                            "var(--font-jetbrains-mono), monospace",
                          fontSize: "0.85rem",
                        }}
                      >
                        {record.TTL}
                      </TableCell>
                      <TableCell
                        sx={{
                          fontFamily:
                            "var(--font-jetbrains-mono), monospace",
                          fontSize: "0.85rem",
                          wordBreak: "break-all",
                          maxWidth: 360,
                        }}
                      >
                        {record.data}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="small"
                          onClick={() => handleCopy(record.data)}
                          sx={{
                            minWidth: 36,
                            p: 0.5,
                            borderRadius: 1,
                          }}
                        >
                          <ContentCopyIcon sx={{ fontSize: 14 }} />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {/* Empty state */}
          {!results && !loading && !error && (
            <Box
              sx={{
                textAlign: "center",
                py: 10,
                color: "text.disabled",
              }}
            >
              <SearchIcon sx={{ fontSize: 56, mb: 2, opacity: 0.3 }} />
              <Typography variant="body2">
                {t.tools.dns.hint}
              </Typography>
            </Box>
          )}
        </Box>
      </Box>
      <Footer />

      <Snackbar
        open={toast.open}
        autoHideDuration={2000}
        onClose={() => setToast({ ...toast, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity="success" variant="filled" sx={{ borderRadius: 2 }}>
          {toast.message}
        </Alert>
      </Snackbar>
    </div>
  );
}
