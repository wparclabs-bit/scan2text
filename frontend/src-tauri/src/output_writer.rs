/// Output writer — owns file writing, naming, and collision rules.
///
/// This module replaces the Python backend's responsibility for writing
/// Markdown output files. The frontend orchestrates the write via this
/// Tauri command after receiving completed content from the backend.

use std::fs;
use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};
use tauri::State;

use crate::AppState;

/// Input for the write_output_file command.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WriteOutputFileInput {
    /// The Markdown content to write.
    pub content: String,
    /// The original source filename (used to derive stem).
    pub source_filename: String,
    /// The output directory path.
    pub output_dir: String,
    /// The completion date for timestamp in filename.
    pub completion_date: String,
}

/// Output of the write_output_file command.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WriteOutputFileOutput {
    /// The final filename (including extension).
    pub filename: String,
    /// The full path to the written file.
    pub path: String,
}

/// Error type for write operations.
// Kept for future use if structured errors are needed.

/// Sanitize a filename stem to be Windows-safe.
fn sanitize_stem(stem: &str) -> String {
    let cleaned: String = stem
        .chars()
        .filter(|c| !['<', '>', ':', '"', '/', '\\', '|', '?', '*'].contains(c))
        .collect();
    let collapsed: String = cleaned
        .split_whitespace()
        .collect::<Vec<&str>>()
        .join("_");
    collapsed
        .trim_matches('_')
        .to_lowercase()
        .replace(['.'], "_")
}

/// Generate the base filename without collision suffix.
fn generate_base_filename(stem: &str, completion_date: &str) -> String {
    // Expected format: "YYYY-MM-DDTHH:MM:SS" or similar ISO format
    // We parse to extract time and date components
    let parts: Vec<&str> = completion_date.split('T').collect();
    if parts.len() < 2 {
        // Fallback: use the raw string
        return format!("{}_{}.md", stem, completion_date);
    }

    let date_part = parts[0];
    let time_part = parts[1];

    // Extract HHmm from time_part (format: HH:MM:SS or HH:MM)
    let time_tokens: Vec<&str> = time_part.split(':').collect();
    let hhmm = if time_tokens.len() >= 2 {
        format!("{}{}", time_tokens[0], time_tokens[1])
    } else {
        "0000".to_string()
    };

    // Extract yyyyMMdd from date_part (format: YYYY-MM-DD)
    let date_tokens: Vec<&str> = date_part.split('-').collect();
    let yyyymmdd = if date_tokens.len() >= 3 {
        format!("{}{}{}", date_tokens[0], date_tokens[1], date_tokens[2])
    } else {
        "19700101".to_string()
    };

    format!("{}_{}_{}.md", stem, hhmm, yyyymmdd)
}

/// Generate a unique filename with collision handling.
/// Collision suffix: _2, _3, etc. Never overwrites.
fn resolve_unique_filename(output_dir: &Path, base_name: &str) -> Result<PathBuf, String> {
    let candidate = output_dir.join(base_name);
    if !candidate.exists() {
        return Ok(candidate);
    }

    // Collision: append _2, _3, etc.
    let stem = base_name.trim_end_matches(".md");
    let mut suffix = 2;
    loop {
        let collision_name = format!("{}_{}.md", stem, suffix);
        let collision_path = output_dir.join(&collision_name);
        if !collision_path.exists() {
            return Ok(collision_path);
        }
        suffix += 1;
    }
}

/// Write the output file with the given content.
/// Returns the final filename and path.
#[tauri::command]
pub async fn write_output_file(
    _state: State<'_, AppState>,
    input: WriteOutputFileInput,
) -> Result<WriteOutputFileOutput, String> {
    // Ensure output directory exists
    let output_dir = PathBuf::from(&input.output_dir);
    fs::create_dir_all(&output_dir).map_err(|e| format!("Failed to create output dir: {}", e))?;

    // Sanitize stem from source filename
    let stem = sanitize_stem(&input.source_filename);
    let base_name = generate_base_filename(&stem, &input.completion_date);

    // Resolve unique filename (collision handling)
    let final_path = resolve_unique_filename(&output_dir, &base_name)?;

    // Write the file
    fs::write(&final_path, &input.content).map_err(|e| format!("Failed to write file: {}", e))?;

    Ok(WriteOutputFileOutput {
        filename: final_path
            .file_name()
            .map(|s| s.to_string_lossy().to_string())
            .unwrap_or_default(),
        path: final_path.to_string_lossy().to_string(),
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::TempDir;

    #[test]
    fn test_sanitize_stem_removes_invalid_chars() {
        assert_eq!(sanitize_stem("file<with>:invalid|chars?.txt"), "filewithinvalidchars_txt");
    }

    #[test]
    fn test_sanitize_stem_replaces_spaces() {
        assert_eq!(sanitize_stem("my invoice"), "my_invoice");
    }

    #[test]
    fn test_sanitize_stem_lowercases() {
        assert_eq!(sanitize_stem("DOCUMENT.PDF"), "document_pdf");
    }

    #[test]
    fn test_generate_base_filename() {
        let result = generate_base_filename("invoice", "2026-09-04T14:30:00");
        assert_eq!(result, "invoice_1430_20260904.md");
    }

    #[test]
    fn test_generate_base_filename_midnight() {
        let result = generate_base_filename("test", "2026-01-01T00:00:00");
        assert_eq!(result, "test_0000_20260101.md");
    }

    #[test]
    fn test_resolve_unique_filename_no_collision() {
        let tmp = TempDir::new().unwrap();
        let path = resolve_unique_filename(tmp.path(), "test_1430_20260904.md").unwrap();
        assert_eq!(path.file_name().unwrap(), "test_1430_20260904.md");
    }

    #[test]
    fn test_resolve_unique_filename_with_collision() {
        let tmp = TempDir::new().unwrap();
        let base = "test_1430_20260904.md";
        // Pre-create the base file
        fs::write(tmp.path().join(base), "existing").unwrap();

        let path = resolve_unique_filename(tmp.path(), base).unwrap();
        assert_eq!(path.file_name().unwrap(), "test_1430_20260904_2.md");
    }

    #[test]
    fn test_resolve_unique_filename_double_collision() {
        let tmp = TempDir::new().unwrap();
        let base = "test_1430_20260904.md";
        fs::write(tmp.path().join(base), "existing").unwrap();
        fs::write(tmp.path().join("test_1430_20260904_2.md"), "existing2").unwrap();

        let path = resolve_unique_filename(tmp.path(), base).unwrap();
        assert_eq!(path.file_name().unwrap(), "test_1430_20260904_3.md");
    }

    #[test]
    fn test_resolve_unique_filename_never_overwrites() {
        let tmp = TempDir::new().unwrap();
        let base = "test_1430_20260904.md";
        fs::write(tmp.path().join(base), "original content").unwrap();

        let path = resolve_unique_filename(tmp.path(), base).unwrap();
        
        // Original file should be unchanged
        let original = fs::read_to_string(tmp.path().join(base)).unwrap();
        assert_eq!(original, "original content");
        
        // New file should be at collision path
        assert_eq!(path.file_name().unwrap(), "test_1430_20260904_2.md");
    }

    #[test]
    fn test_write_creates_directory() {
        let tmp = TempDir::new().unwrap();
        let nested = tmp.path().join("subdir");
        let input = WriteOutputFileInput {
            content: "# Hello World".to_string(),
            source_filename: "test.pdf".to_string(),
            output_dir: nested.to_string_lossy().to_string(),
            completion_date: "2026-09-04T14:30:00".to_string(),
        };

        // This would be called via the command, but we test the logic directly
        fs::create_dir_all(input.output_dir.as_str()).unwrap();
        let base_name = generate_base_filename(&sanitize_stem("test"), "2026-09-04T14:30:00");
        let path = resolve_unique_filename(PathBuf::from(&input.output_dir).as_path(), &base_name).unwrap();
        fs::write(&path, &input.content).unwrap();

        assert!(path.exists());
        let content = fs::read_to_string(&path).unwrap();
        assert_eq!(content, "# Hello World");
    }
}
