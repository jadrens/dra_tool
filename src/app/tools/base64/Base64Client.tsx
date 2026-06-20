"use client";

import { useState } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  ToggleButtonGroup,
  ToggleButton,
  Snackbar,
  Alert,
  useTheme,
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { useI18n } from "@/lib/i18n";
import { alpha } from "@mui/material";

type Mode = "encode" | "decode";

export default function Base64Client() {
  const { t } = useI18n();
  const theme = useTheme();

  const [mode, setMode] = useState<Mode>("encode");
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [toast, setToast] = useState({ open: false, message: "" });

  const handleModeChange = (_: React.MouseEvent<HTMLElement>, newMode: Mode | null) => {
    if (newMode !== null) {
      setMode(newMode);
      setInput("");
      setOutput("");
    }
  };

  const handleConvert = () => {
    if (!input.trim()) {
      setOutput("");
      return;
    }
    try {
      if (mode === "encode") {
        // Use TextEncoder for proper UTF-8 handling
        const encoder = new TextEncoder();
        const bytes = encoder.encode(input);
        let binary = "";
        bytes.forEach((b) => (binary += String.fromCharCode(b)));
        setOutput(btoa(binary));
      } else {
        const binary = atob(input.trim());
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        const decoder = new TextDecoder("utf-8");
        setOutput(decoder.decode(bytes));
      }
    } catch {
      setOutput(mode === "encode" ? "Invalid input for encoding" : "Invalid Base64 string");
    }
  };

  const handleCopy = async () => {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output);
      setToast({ open: true, message: t.tools.base64.copied });
    } catch {
      setToast({ open: true, message: "Failed to copy" });
    }
  };

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
        <Box sx={{ width: "100%", maxWidth: 720 }}>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 700,
              textAlign: "center",
              mb: 4,
              fontFamily: "var(--font-inter)",
            }}
          >
            {t.tools.base64.title}
          </Typography>

          {/* Mode toggle */}
          <Box sx={{ display: "flex", justifyContent: "center", mb: 4 }}>
            <ToggleButtonGroup
              value={mode}
              exclusive
              onChange={handleModeChange}
              aria-label="encode or decode mode"
              sx={{
                "& .MuiToggleButton-root": {
                  px: 4,
                  py: 1,
                  textTransform: "none",
                  fontWeight: 600,
                  borderRadius: 2,
                  border: 1,
                  borderColor: "divider",
                  "&.Mui-selected": {
                    bgcolor: alpha(theme.palette.primary.main, 0.12),
                    color: "primary.main",
                    borderColor: "primary.main",
                  },
                },
              }}
            >
              <ToggleButton value="encode">{t.tools.base64.encode}</ToggleButton>
              <ToggleButton value="decode">{t.tools.base64.decode}</ToggleButton>
            </ToggleButtonGroup>
          </Box>

          {/* Input */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
              {t.tools.base64.input}
            </Typography>
            <TextField
              multiline
              fullWidth
              minRows={6}
              maxRows={12}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                mode === "encode"
                  ? t.tools.base64.inputPlaceholder
                  : t.tools.base64.decodePlaceholder
              }
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: 2,
                  fontFamily: "var(--font-jetbrains-mono), monospace",
                  fontSize: "0.875rem",
                },
              }}
            />
          </Box>

          {/* Convert button */}
          <Box sx={{ display: "flex", justifyContent: "center", mb: 3 }}>
            <Button
              variant="contained"
              onClick={handleConvert}
              disabled={!input.trim()}
              sx={{
                px: 5,
                py: 1.2,
                borderRadius: 2,
                textTransform: "none",
                fontWeight: 600,
                fontSize: "1rem",
              }}
            >
              {mode === "encode" ? t.tools.base64.encode : t.tools.base64.decode}
            </Button>
          </Box>

          {/* Output */}
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                {t.tools.base64.output}
              </Typography>
              {output && (
                <Button
                  size="small"
                  startIcon={<ContentCopyIcon sx={{ fontSize: 16 }} />}
                  onClick={handleCopy}
                  sx={{ textTransform: "none", borderRadius: 1.5 }}
                >
                  {t.tools.base64.copy}
                </Button>
              )}
            </Box>
            <TextField
              multiline
              fullWidth
              minRows={6}
              maxRows={12}
              value={output}
              slotProps={{
                input: {
                  readOnly: true,
                },
              }}
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: 2,
                  fontFamily: "var(--font-jetbrains-mono), monospace",
                  fontSize: "0.875rem",
                  bgcolor: alpha(theme.palette.action.hover, 0.04),
                },
              }}
            />
          </Box>
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
