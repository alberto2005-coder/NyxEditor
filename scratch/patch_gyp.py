import os
import re

def patch_gyp(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Check if it already has C++20
    if '/std:c++20' in content or '-std=c++20' in content:
        return False

    # Look for msvs_settings and VCCLCompilerTool
    # We want to add '/std:c++20' to 'AdditionalOptions'
    
    # Pattern to find AdditionalOptions inside VCCLCompilerTool
    pattern = r"('AdditionalOptions'|\"AdditionalOptions\")\s*:\s*\["
    
    if re.search(pattern, content):
        # Add it to the start of the list
        new_content = re.sub(pattern, r"\1: [\n                '/std:c++20',", content)
    else:
        # Need to add AdditionalOptions if it doesn't exist
        # Find VCCLCompilerTool
        pattern_vc = r"('VCCLCompilerTool'|\"VCCLCompilerTool\")\s*:\s*\{"
        if re.search(pattern_vc, content):
            new_content = re.sub(pattern_vc, r"\1: {\n                'AdditionalOptions': [ '/std:c++20' ],", content)
        else:
            # Maybe it doesn't have VCCLCompilerTool, find msvs_settings
            pattern_msvs = r"('msvs_settings'|\"msvs_settings\")\s*:\s*\{"
            if re.search(pattern_msvs, content):
                new_content = re.sub(pattern_msvs, r"\1: {\n            'VCCLCompilerTool': { 'AdditionalOptions': [ '/std:c++20' ] },", content)
            else:
                return False

    if new_content != content:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        return True
    return False

root = r'C:\Users\alors\Downloads\NyxEditor'
for dirpath, dirnames, filenames in os.walk(root):
    if 'node_modules' in dirpath or dirpath == root:
        for filename in filenames:
            if filename == 'binding.gyp':
                full_path = os.path.join(dirpath, filename)
                if patch_gyp(full_path):
                    print(f"Patched: {full_path}")
