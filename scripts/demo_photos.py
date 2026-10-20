"""
Демо-фотографии: подготовка и проверка папки backend/src/main/resources/demo-photos (их читает DemoPhotos).

Нужен Python 3 и Pillow:  pip install pillow

  python scripts/demo_photos.py check
      что уже лежит и каких папок не хватает

  python scripts/demo_photos.py import <папка>
      берёт картинки любых имён и форматов (jpg, jpeg, png, webp, heic не поддерживается) из подпапок <папка>/<вид>/
      и кладёт их в demo-photos/<вид>/1.webp, 2.webp, … — уменьшает до 1280 px по длинной стороне, WebP q75.
      Подпапки avatars/women и avatars/men — портреты массовки (квадрат 256 px), файлы avatars/<логин>.* — аватары
      главных героев (anna, petr, olga, elena, dmitry, sergey, nikolai, vika).
      Существующие файлы вида заменяются целиком, другие виды не трогаются.

  python scripts/demo_photos.py convert
      переводит уже лежащие jpg/png в WebP на месте (нумерация сохраняется)
"""
import os
import sys
from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent / 'backend' / 'src' / 'main' / 'resources' / 'demo-photos'
SPORTS = {
    'football': 'Футбол', 'running': 'Бег', 'volleyball': 'Волейбол (зал)', 'beachvolleyball': 'Волейбол (пляж)',
    'basketball': 'Баскетбол', 'cycling': 'Велоспорт', 'tennis': 'Теннис', 'tabletennis': 'Настольный теннис',
    'swimming': 'Плавание', 'yoga': 'Йога', 'chess': 'Шахматы', 'nordicwalking': 'Скандинавская ходьба',
    'exercise': 'Зарядка', 'padel': 'Падел', 'climbing': 'Скалолазание', 'badminton': 'Бадминтон',
    'frisbee': 'Фрисби', 'workout': 'Воркаут', 'sup': 'Сапсёрфинг', 'hockey': 'Хоккей', 'petanque': 'Петанк',
    'coding': 'Спортивное программирование', 'fitness': 'Фитнес (онлайн)',
}
CAST = ['anna', 'petr', 'olga', 'elena', 'dmitry', 'sergey', 'nikolai', 'vika']
IMAGE_EXT = {'.jpg', '.jpeg', '.png', '.webp'}
PHOTO_SIDE = 1280
AVATAR_SIDE = 256


def images(folder: Path):
    return sorted(p for p in folder.iterdir() if p.is_file() and p.suffix.lower() in IMAGE_EXT) if folder.is_dir() else []


def numbered(folder: Path):
    """Файлы 1.*, 2.*, … подряд — ровно то, что увидит DemoPhotos."""
    found, n = [], 1
    while True:
        hits = [folder / f'{n}{ext}' for ext in ('.webp', '.jpg', '.jpeg', '.png') if (folder / f'{n}{ext}').exists()]
        if not hits:
            return found
        found.append(hits[0])
        n += 1


def save_photo(src: Path, dst: Path):
    im = ImageOps.exif_transpose(Image.open(src)).convert('RGB')
    im.thumbnail((PHOTO_SIDE, PHOTO_SIDE))
    im.save(dst, 'WEBP', quality=75, method=6)


def save_avatar(src: Path, dst: Path):
    im = ImageOps.exif_transpose(Image.open(src)).convert('RGB')
    im = ImageOps.fit(im, (AVATAR_SIDE, AVATAR_SIDE), centering=(0.5, 0.35))
    im.save(dst, 'WEBP', quality=80, method=6)


def replace_folder(src_files, dst: Path, saver):
    dst.mkdir(parents=True, exist_ok=True)
    for old in images(dst):
        old.unlink()
    for n, f in enumerate(src_files, 1):
        saver(f, dst / f'{n}.webp')
    return len(src_files)


def cmd_import(src: Path):
    for key in list(SPORTS) + ['avatars/women', 'avatars/men']:
        files = images(src / key)
        if files:
            count = replace_folder(files, ROOT / key, save_avatar if key.startswith('avatars') else save_photo)
            print(f'{key}: {count}')
    for user in CAST:
        for f in images(src / 'avatars'):
            if f.stem.lower() == user:
                (ROOT / 'avatars').mkdir(parents=True, exist_ok=True)
                for old in (ROOT / 'avatars').glob(user + '.*'):
                    old.unlink()
                save_avatar(f, ROOT / 'avatars' / f'{user}.webp')
                print(f'avatars/{user}')
    cmd_check()


def cmd_convert():
    for folder in [ROOT / k for k in list(SPORTS) + ['avatars/women', 'avatars/men']] + [ROOT / 'avatars']:
        if not folder.is_dir():
            continue
        files = images(folder) if folder.name == 'avatars' else numbered(folder)
        for f in files:
            if f.suffix.lower() == '.webp':
                continue
            dst = f.with_suffix('.webp')
            (save_avatar if 'avatars' in f.parts else save_photo)(f, dst)
            f.unlink()
    cmd_check()


def cmd_check():
    total = 0
    print(f'\n{ROOT}\n')
    for key, label in SPORTS.items():
        files = numbered(ROOT / key)
        total += sum(f.stat().st_size for f in files)
        mark = 'ok ' if len(files) >= 3 else ('мало' if files else 'НЕТ')
        print(f'  [{mark}] {key:16} {label:30} {len(files)}')
    for g in ('women', 'men'):
        files = numbered(ROOT / 'avatars' / g)
        total += sum(f.stat().st_size for f in files)
        print(f'  [{"ok " if files else "НЕТ"}] avatars/{g:10} портреты массовки {len(files)}')
    missing = [u for u in CAST if not list((ROOT / 'avatars').glob(u + '.*'))]
    print(f'  аватары героев без фото: {", ".join(missing) or "все есть"}')
    print(f'\n  всего {total / 1024 / 1024:.1f} МБ')


if __name__ == '__main__':
    args = sys.argv[1:]
    if not args or args[0] == 'check':
        cmd_check()
    elif args[0] == 'import' and len(args) == 2:
        cmd_import(Path(args[1]))
    elif args[0] == 'convert':
        cmd_convert()
    else:
        print(__doc__)
        sys.exit(1)
