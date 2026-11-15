# Scan2Text Glossary

Scan2Text turns files into Markdown. This glossary fixes the words we use for the engines, models, and decisions behind that work, so the UI, the backend, and the docs all speak the same language.

## Language

**Provider**:
A vendor endpoint that accepts requests on our behalf, such as NVIDIA NIM, OpenAI, or a private server.
_Avoid_: Vendor, service, platform

**Model**:
One specific model id offered by a provider, such as `nvidia/nemotron-3.5-super-vl-120b-a12b`.
_Avoid_: Engine, profile

**Local model files**:
The Ovis model pair on disk, `models/vlm.gguf` plus `models/mmproj.gguf`, that runs on the user's CPU.
_Avoid_: Model, when the local files are meant

**Engine**:
A configured way to turn a file into Markdown. Scan2Text has two: the Local engine and the Cloud engine.
_Avoid_: Model, backend, worker

**Recipe**:
The prompt, sampling settings, and geometry that an engine uses to produce Markdown.
_Avoid_: Prompt, configuration, settings

**Profile**:
A named bundle of a provider, a model, and a recipe. The user may hold several profiles and switch between them.
_Avoid_: Account, connection, preset

**Route**:
The decision that picks one engine for one file. Routing works per file, never per batch.
_Avoid_: Dispatch, selection

**Job**:
One file moving through the queue from pending to a terminal state.
_Avoid_: Task, when the user-facing queue item is meant

**Batch**:
The set of files the user submits together. A batch may split across engines.
_Avoid_: Queue

**Band**:
A group of consecutive pages sent to a provider in one request. The Cloud engine sends five pages per band.
_Avoid_: Batch, chunk, request

**Column segment**:
A vertical slice of one wide table, OCR'd separately and stitched back by row index.
_Avoid_: Band, strip

**Cloud consent**:
The user's agreement to let one specific file leave the device, shown before the first cloud job.
_Avoid_: Consent dialog, permission
