#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
下载声音文件脚本
从 voice-index.json 读取所有声音信息，下载到 voice-bank 文件夹
"""

import json
import os
import urllib.request
import urllib.error
from pathlib import Path

def sanitize_filename(filename):
    """清理文件名，移除或替换不合法字符"""
    # 移除或替换不合法字符
    invalid_chars = '<>:"/\\|?*'
    for char in invalid_chars:
        filename = filename.replace(char, '_')
    # 移除前后空格
    filename = filename.strip()
    return filename

def download_file(url, filepath):
    """下载文件"""
    try:
        print(f"正在下载: {filepath.name}")
        urllib.request.urlretrieve(url, filepath)
        print(f"✓ 下载完成: {filepath.name}")
        return True
    except urllib.error.URLError as e:
        print(f"✗ 下载失败: {filepath.name} - {e}")
        return False
    except Exception as e:
        print(f"✗ 下载失败: {filepath.name} - {e}")
        return False

def main():
    # 获取脚本所在目录
    script_dir = Path(__file__).parent
    json_file = script_dir / "voice-index.json"
    output_dir = script_dir

    # 读取 JSON 文件
    print(f"读取配置文件: {json_file}")
    try:
        with open(json_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except FileNotFoundError:
        print(f"错误: 找不到文件 {json_file}")
        return
    except json.JSONDecodeError as e:
        print(f"错误: JSON 解析失败 - {e}")
        return

    voices = data.get('voices', [])
    print(f"找到 {len(voices)} 个声音文件\n")

    # 确保输出目录存在
    output_dir.mkdir(parents=True, exist_ok=True)

    # 统计
    success_count = 0
    fail_count = 0
    skip_count = 0

    # 下载每个声音文件
    for i, voice in enumerate(voices, 1):
        name = voice.get('name', '')
        voice_id = voice.get('voice_id', '')
        url = voice.get('url', '')

        if not url:
            print(f"[{i}/{len(voices)}] 跳过: {name} (无URL)")
            skip_count += 1
            continue

        # 生成文件名: name+voice_id.mp3
        filename = f"{name}{voice_id}.mp3"
        filename = sanitize_filename(filename)
        filepath = output_dir / filename

        # 检查文件是否已存在
        if filepath.exists():
            print(f"[{i}/{len(voices)}] 跳过: {filename} (已存在)")
            skip_count += 1
            continue

        # 下载文件
        print(f"[{i}/{len(voices)}] ", end='')
        if download_file(url, filepath):
            success_count += 1
        else:
            fail_count += 1

    # 打印统计信息
    print("\n" + "="*50)
    print("下载完成!")
    print(f"成功: {success_count}")
    print(f"失败: {fail_count}")
    print(f"跳过: {skip_count}")
    print(f"总计: {len(voices)}")

if __name__ == "__main__":
    main()


