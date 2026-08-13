fn main() {
    // Minimal build - Tauri config read at runtime via tauri.conf.json
    println!("cargo:rerun-if-changed=tauri.conf.json");
    println!("cargo:rerun-if-changed=capabilities");
}
