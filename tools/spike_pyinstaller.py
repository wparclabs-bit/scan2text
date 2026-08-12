import sys
print(f"Python {sys.version}")

try:
    import llama_cpp
    version = getattr(llama_cpp, "__version__", "IMPORT_SUCCESS")
    print(f"llama_cpp {version}")
except Exception as e:
    print(f"llama_cpp IMPORT_FAILED: {e}")

print("SPIKE_COMPLETE")
