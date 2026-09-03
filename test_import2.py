import sys
sys.path.append('D:\\WingAI\\Projects\\scan2text\\src')
import importlib.util
spec = importlib.util.spec_from_file_location('path_service', 'D:\\WingAI\\Projects\\scan2text\\src\\scan2text\\services\\path_service.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
print('Module keys:', list(module.__dict__.keys())[:20])
print('Has sanitize_filename:', 'sanitize_filename' in module.__dict__)
print('sanitize_filename callable:', callable(module.__dict__['sanitize_filename']))