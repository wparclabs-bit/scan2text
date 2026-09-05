/// File metadata retrieval — pure std::fs helper + Tauri command.
///
/// Under the U2 contract, the frontend receives absolute file paths (not File
/// objects with size metadata). This module provides a Rust-side command that
/// reads file metadata so the frontend can enforce the product requirement (20MB cap)
/// before files enter the queue.

use serde::{Deserialize, Serialize};

/// Result of querying a single file's metadata.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileMetadata {
    /// The path that was queried.
    pub path: String,
    /// Size in bytes, or None if the file could not be stat'd.
    pub size: Option<u64>,
    /// true when the file exists and is a regular file.
    pub exists: bool,
}

/// Query metadata for a single file path using std::fs only.
pub fn get_file_metadata(path: &str) -> FileMetadata {
    let std_path = std::path::Path::new(path);
    match std_path.metadata() {
        Ok(meta) => FileMetadata {
            path: path.to_string(),
            size: Some(meta.len()),
            exists: true,
        },
        Err(_) => FileMetadata {
            path: path.to_string(),
            size: None,
            exists: false,
        },
    }
}

/// Query metadata for multiple file paths. Returns a vector in the same order.
pub fn get_file_metadata_batch(paths: &[&str]) -> Vec<FileMetadata> {
    paths.iter().map(|p| get_file_metadata(p)).collect()
}

/// Tauri command: returns file metadata for a list of absolute paths.
#[tauri::command]
pub async fn get_file_metadata_command(paths: Vec<String>) -> Vec<FileMetadata> {
    let slice: Vec<&str> = paths.iter().map(|s| s.as_str()).collect();
    get_file_metadata_batch(&slice)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::TempDir;

    #[test]
    fn test_existing_file_returns_size() {
        let tmp = TempDir::new().unwrap();
        let file_path = tmp.path().join("test.txt");
        fs::write(&file_path, "hello").unwrap();
        let path_str = file_path.to_string_lossy().to_string();

        let meta = get_file_metadata(&path_str);
        assert!(meta.exists);
        assert_eq!(meta.size, Some(5));
    }

    #[test]
    fn test_missing_file_returns_none_size_and_false_exists() {
        let meta = get_file_metadata("/nonexistent/path/file.txt");
        assert!(!meta.exists);
        assert!(meta.size.is_none());
    }

    #[test]
    fn test_batch_preserves_order() {
        let tmp = TempDir::new().unwrap();
        let a = tmp.path().join("a.txt");
        let b = tmp.path().join("b.txt");
        fs::write(&a, "aa").unwrap();
        fs::write(&b, "bbb").unwrap();

        let results = get_file_metadata_batch(&[
            a.to_string_lossy().as_ref(),
            b.to_string_lossy().as_ref(),
        ]);
        assert_eq!(results.len(), 2);
        assert_eq!(results[0].size, Some(2));
        assert_eq!(results[1].size, Some(3));
    }

    #[test]
    fn test_batch_mixed_existing_and_missing() {
        let tmp = TempDir::new().unwrap();
        let existing = tmp.path().join("ok.png");
        fs::write(&existing, vec![0u8; 1024]).unwrap();

        let results = get_file_metadata_batch(&[
            existing.to_string_lossy().as_ref(),
            "/nonexistent/missing.pdf",
        ]);
        assert_eq!(results.len(), 2);
        assert!(results[0].exists);
        assert_eq!(results[0].size, Some(1024));
        assert!(!results[1].exists);
        assert!(results[1].size.is_none());
    }
}
