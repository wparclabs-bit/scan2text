Screen Elements Breakdown

This interface represents a web-based Optical Character Recognition (OCR) application named **Scan2Text** operating in a demo environment.

Header and Status

- **Scan2Text**: The main application title or brand name.
- **MODE DEMO**: Indicates the application is currently running in a restricted or evaluation environment.

Interactive Controls

- **Ubah tema** _(Change theme)_: A button triggering a style toggle between light and dark modes.
- **Ubah bahasa** _(Change language)_: A button to modify the target language localization or OCR processing dictionary.
- **Gear Icon**: A standard settings button configuration element.
- **Choose Files / No file chosen**: HTML file input element (`<input type="file">`) for uploading documents or images.

Drop-Zone and Localized State Labels

- **Click or drag files here**: Informational text guiding the user on how to upload images for scanning via drag-and-drop mechanics.
- **Tidak ada file dalam antrian** _(No files in queue)_: System state message showing that the processing pipeline or queue is currently empty.
- **Pilih pekerjaan yang sudah selesai untuk melihat keajaibannya** _(Select completed jobs to see the magic)_: Instructional UI message telling the user to click on processed tasks to view the finalized OCR output results.

System Footer

- **Worker: Idle**: Shows the current background worker state machine status.
- **RAM: 1.8 GB**: Current system memory footprint or available RAM allocated for execution.
- **v0.1.0-demo**: The specific build version tag of the deployment.