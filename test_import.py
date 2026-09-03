import sys
sys.path.append('D:\\WingAI\\Projects\\scan2text\\src')
from scan2text.services.path_service import sanitize_filename
print('Imported sanitize_filename:', hasattr(sanitize_filename, '__call__'))
print('Test result:', sanitize_filename('test*file'))