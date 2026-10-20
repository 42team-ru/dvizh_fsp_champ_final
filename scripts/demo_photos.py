"""
Демо-фотографии: скачивание, подготовка и проверка папки backend/src/main/resources/demo-photos (их читает DemoPhotos).

Нужен Python 3 и Pillow:  pip install pillow

  python scripts/demo_photos.py check
      что уже лежит и каких папок не хватает

  python scripts/demo_photos.py fetch <вид> [сколько] [--query "свой запрос"]
      ищет фото на Wikimedia Commons (только свободные лицензии), качает превью стандартного размера по одному
      с паузой (лимиты Commons не срабатывают), сразу кладёт в demo-photos/<вид>/N.webp и записывает автора
      и лицензию в credits.json и CREDITS.md. Уже скачанные снимки повторно не берутся ни в одну папку.
      Без вида — все виды из SPORTS до TARGET штук.

  python scripts/demo_photos.py sheet <вид>
      лист-превью с номерами (build/demo-photos-sheets/<вид>.jpg) — глазами отобрать лишнее

  python scripts/demo_photos.py drop <вид> <номер> [номер …]
      удалить снимки и перенумеровать оставшиеся подряд (DemoPhotos читает 1, 2, 3… до первого пропуска)

  python scripts/demo_photos.py import <папка>
      свои картинки: <папка>/<вид>/* → demo-photos/<вид>/N.webp; avatars/women|men — портреты массовки,
      avatars/<логин>.* — аватары героев (anna, petr, olga, elena, dmitry, sergey, nikolai, vika)

  python scripts/demo_photos.py convert
      перевести лежащие jpg/png в WebP на месте
"""
import html
import io
import json
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

from PIL import Image, ImageDraw, ImageOps

PROJECT = Path(__file__).resolve().parent.parent
ROOT = PROJECT / 'backend' / 'src' / 'main' / 'resources' / 'demo-photos'
CREDITS_JSON = ROOT / 'credits.json'
SHEETS = PROJECT / 'backend' / 'build' / 'demo-photos-sheets'
SPORTS = {
    'football': 'Футбол', 'running': 'Бег', 'volleyball': 'Волейбол (зал)', 'beachvolleyball': 'Волейбол (пляж)',
    'basketball': 'Баскетбол', 'cycling': 'Велоспорт', 'tennis': 'Теннис', 'tabletennis': 'Настольный теннис',
    'swimming': 'Плавание', 'yoga': 'Йога', 'chess': 'Шахматы', 'nordicwalking': 'Скандинавская ходьба',
    'exercise': 'Зарядка', 'padel': 'Падел', 'climbing': 'Скалолазание', 'badminton': 'Бадминтон',
    'frisbee': 'Фрисби', 'workout': 'Воркаут', 'sup': 'Сапсёрфинг', 'hockey': 'Хоккей', 'petanque': 'Петанк',
    'coding': 'Спортивное программирование', 'fitness': 'Фитнес (онлайн)', 'clubs': 'Фото организаций',
}
# Запросы к Commons: сначала самые точные, остальные — если не хватило.
QUERIES = {
    'football': ['grassroots football', 'amateur football match', 'football pitch players', 'five-a-side football', 'Sunday league football', 'football training youth',
                 'футбол любительский'],
    'running': ['parkrun participants', 'amateur runners race', 'charity run participants', 'half marathon runners',
                'group of runners park', 'running club'],
    'volleyball': ['volleyball match indoor', 'volleyball gym amateur', 'волейбол'],
    'beachvolleyball': ['beach volleyball', 'beach volleyball amateur', 'пляжный волейбол'],
    'basketball': ['streetball', '3x3 basketball', 'basketball outdoor court', 'pickup basketball'],
    'cycling': ['group cycling road', 'bicycle ride group', 'cyclists park', 'critical mass bicycle'],
    'tennis': ['tennis doubles', 'amateur tennis court', 'tennis player club'],
    'tabletennis': ['table tennis', 'ping pong outdoor', 'table tennis club'],
    'swimming': ['swimming pool lane swimmer', 'swimming freestyle', 'swimming pool training'],
    'yoga': ['yoga outdoor group', 'yoga class park', 'yoga class'],
    'chess': ['chess players', 'chess tournament', 'chess park', 'chess club'],
    'nordicwalking': ['nordic walking group', 'nordic walking poles people', 'nordic walking seniors', 'nordic walking'],
    'exercise': ['outdoor fitness seniors', 'group exercise park', 'tai chi park morning', 'morning gymnastics group',
                 'senior exercise'],
    'padel': ['padel', 'padel court', 'padel tennis'],
    'climbing': ['bouldering gym climber', 'climbing wall climber', 'indoor bouldering', 'sport climbing gym'],
    'badminton': ['badminton player shuttlecock', 'badminton match players', 'playing badminton', 'badminton doubles'],
    'frisbee': ['ultimate frisbee', 'disc ultimate', 'frisbee park'],
    'workout': ['street workout', 'calisthenics', 'outdoor gym bars', 'воркаут'],
    'sup': ['stand up paddle', 'paddleboarding', 'stand up paddleboard river', 'сапсерфинг'],
    'hockey': ['ice hockey game players', 'recreational ice hockey', 'ice hockey practice', 'ice hockey amateur',
               'pond hockey'],
    'petanque': ['petanque', 'pétanque', 'boules players'],
    'coding': ['hackathon', 'programming contest', 'hackathon participants'],
    'fitness': ['stretching exercise', 'fitness class', 'group fitness'],
    # фото для организаций: логотип клуба — командное фото
    'clubs': ['sports club members group photo', 'running club group photo', 'amateur team photo',
              'chess club members', 'cycling club group photo', 'volleyball team photo amateur'],
}
# Сколько снимков держать на вид: популярные встречаются в ленте чаще.
TARGET = {'football': 20, 'running': 20, 'chess': 14, 'yoga': 14, 'volleyball': 10, 'beachvolleyball': 10,
          'basketball': 14, 'cycling': 14, 'hockey': 12, 'clubs': 24}
DEFAULT_TARGET = 9
# В названии файла — почти всегда не то, что нужно на обложке.
BAD_TITLE = re.compile(r'logo|map|stamp|poster|statue|sculpture|diagram|chart|coin|medal|trophy|flag|sign|'
                       r'scan|drawing|painting|illustration|1[89]\d\d|cartoon|screenshot|ticket|card', re.I)
CAST = ['anna', 'petr', 'olga', 'elena', 'dmitry', 'sergey', 'nikolai', 'vika']
IMAGE_EXT = {'.jpg', '.jpeg', '.png', '.webp'}
PHOTO_SIDE = 1024
AVATAR_SIDE = 256
UA = {'User-Agent': 'DvizhDemoSeed/1.0 (hackathon demo data; https://github.com/42team-ru/project_template)'}
PAUSE = 1.5


# --- файлы ---

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


def save_photo(im: Image.Image, dst: Path):
    im = ImageOps.exif_transpose(im).convert('RGB')
    im.thumbnail((PHOTO_SIDE, PHOTO_SIDE))
    im.save(dst, 'WEBP', quality=72, method=6)


def save_avatar(im: Image.Image, dst: Path):
    im = ImageOps.fit(ImageOps.exif_transpose(im).convert('RGB'), (AVATAR_SIDE, AVATAR_SIDE), centering=(0.5, 0.35))
    im.save(dst, 'WEBP', quality=80, method=6)


# --- авторы и лицензии ---

REJECTED = '_rejected'


def load_credits():
    return json.loads(CREDITS_JSON.read_text(encoding='utf-8')) if CREDITS_JSON.exists() else {}


def photo_credits(credits):
    """Только записи о файлах; служебный список отбракованного — отдельно."""
    return {k: v for k, v in credits.items() if k != REJECTED}


def save_credits(credits):
    CREDITS_JSON.write_text(json.dumps(credits, ensure_ascii=False, indent=1, sort_keys=True), encoding='utf-8')
    rows = [f"| {k} | {v.get('artist', '')} | {v.get('license', '')} | {v.get('page', '')} |"
            for k, v in sorted(photo_credits(credits).items(), key=lambda kv: (kv[0].split('/')[0], int(kv[0].split('/')[1].split('.')[0])))]
    (ROOT / 'CREDITS.md').write_text(
        '# Демо-фотографии\n\nТолько для демо-режима (DEMO_MODE=true). Готовит `scripts/demo_photos.py`.\n\n'
        '- Снимки видов спорта — Wikimedia Commons, свободные лицензии (CC0 / Public domain / CC BY / CC BY-SA).\n'
        '- Портреты в `avatars/` — randomuser.me (сгенерированные пользователи, свободны для использования).\n\n'
        '| Файл | Автор | Лицензия | Источник |\n|---|---|---|---|\n' + '\n'.join(rows) + '\n', encoding='utf-8')


# --- Commons ---

def http(url, data=None, attempts=6):
    for attempt in range(attempts):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA, data=data), timeout=60) as r:
                return r.read()
        except urllib.error.HTTPError as e:
            if e.code not in (429, 503) or attempt == attempts - 1:
                raise
            wait = int(e.headers.get('Retry-After') or 0) or 10 * (attempt + 1)
            print(f'    лимит Commons, ждём {wait} с', flush=True)
            time.sleep(wait)


def search(query):
    params = {'action': 'query', 'format': 'json', 'generator': 'search', 'gsrsearch': query + ' filetype:bitmap',
              'gsrnamespace': 6, 'gsrlimit': 50, 'prop': 'imageinfo', 'iiprop': 'url|size|mime|extmetadata',
              'iiurlwidth': 1280}  # 1280 — стандартный шаг превью Commons: готовый файл, без генерации и лимитов
    data = json.loads(http('https://commons.wikimedia.org/w/api.php?' + urllib.parse.urlencode(params)))
    time.sleep(PAUSE)
    found = []
    for page in sorted(data.get('query', {}).get('pages', {}).values(), key=lambda p: p.get('index', 99)):
        info = page['imageinfo'][0]
        meta = info.get('extmetadata', {})
        license_ = meta.get('LicenseShortName', {}).get('value', '')
        if (info.get('mime') != 'image/jpeg' or info['width'] < 1600 or info['width'] < info['height'] * 1.25
                or BAD_TITLE.search(page['title'])
                or not re.search(r'CC0|Public domain|CC BY', license_, re.I) or 'NC' in license_ or 'ND' in license_):
            continue
        year = re.search(r'(1[89]|20)\d\d', meta.get('DateTimeOriginal', {}).get('value', '') or '')
        if year and int(year.group(0)) < 1990:  # старые снимки на обложке смотрятся музеем
            continue
        artist = html.unescape(re.sub('<[^>]+>', '', meta.get('Artist', {}).get('value', ''))).strip()
        found.append({'title': page['title'], 'thumb': info['thumburl'], 'page': info['descriptionurl'],
                      'license': license_, 'artist': artist[:120]})
    return found


def fetch(key, want, queries):
    folder = ROOT / key
    folder.mkdir(parents=True, exist_ok=True)
    credits = load_credits()
    # уже лежащие и отбракованные через drop — повторно не скачиваем
    taken = {v.get('title') for v in photo_credits(credits).values()} | set(credits.get(REJECTED, []))
    have = len(numbered(folder))
    print(f'{key}: есть {have}, нужно {want}', flush=True)
    for query in queries:
        if have >= want:
            break
        for candidate in search(query):
            if have >= want:
                break
            if candidate['title'] in taken:
                continue
            try:
                im = Image.open(io.BytesIO(http(candidate['thumb'])))
            except Exception as e:  # битый файл или сеть — просто следующий
                print(f'    пропуск {candidate["title"]}: {e}', flush=True)
                continue
            finally:
                time.sleep(PAUSE)
            have += 1
            save_photo(im, folder / f'{have}.webp')
            taken.add(candidate['title'])
            credits[f'{key}/{have}.webp'] = candidate
            save_credits(credits)
            print(f'    {have}: {candidate["title"][5:80]}', flush=True)
    print(f'{key}: итого {have}', flush=True)


# --- отбор ---

def sheet(key):
    files = numbered(ROOT / key)
    w, h, cols = 320, 214, 5
    rows = (len(files) + cols - 1) // cols
    canvas = Image.new('RGB', (cols * w, max(rows, 1) * (h + 22)), 'white')
    draw = ImageDraw.Draw(canvas)
    for i, f in enumerate(files):
        im = Image.open(f)
        im.thumbnail((w - 6, h))
        x, y = (i % cols) * w, (i // cols) * (h + 22)
        canvas.paste(im, (x, y + 22))
        draw.text((x + 4, y + 4), f.stem, fill='black')
    SHEETS.mkdir(parents=True, exist_ok=True)
    out = SHEETS / f'{key}.jpg'
    canvas.save(out, quality=80)
    print(out)


def drop(key, numbers):
    folder = ROOT / key
    credits = load_credits()
    files = numbered(folder)
    gone = {int(n) for n in numbers}
    kept = []
    for n, f in enumerate(files, 1):
        meta = credits.pop(f'{key}/{f.name}', None)
        if n in gone:
            f.unlink()
            if meta:
                credits.setdefault(REJECTED, []).append(meta.get('title'))
        else:
            kept.append((f, meta))
    # в два шага: сначала во временные имена, иначе 3.webp → 2.webp затрёт ещё не переименованный файл
    moved = []
    for n, (f, meta) in enumerate(kept, 1):
        tmp = folder / f'_tmp{n}{f.suffix}'
        f.rename(tmp)
        moved.append((tmp, meta))
    for n, (tmp, meta) in enumerate(moved, 1):
        name = f'{n}{tmp.suffix}'
        tmp.rename(folder / name)
        if meta:
            credits[f'{key}/{name}'] = meta
    save_credits(credits)
    print(f'{key}: осталось {len(kept)}')


# --- свои картинки ---

def cmd_import(src: Path):
    for key in list(SPORTS) + ['avatars/women', 'avatars/men']:
        files = images(src / key)
        if not files:
            continue
        dst = ROOT / key
        dst.mkdir(parents=True, exist_ok=True)
        for old in images(dst):
            old.unlink()
        for n, f in enumerate(files, 1):
            (save_avatar if key.startswith('avatars') else save_photo)(Image.open(f), dst / f'{n}.webp')
        print(f'{key}: {len(files)}')
    for f in images(src / 'avatars'):
        if f.stem.lower() in CAST:
            for old in (ROOT / 'avatars').glob(f.stem.lower() + '.*'):
                old.unlink()
            save_avatar(Image.open(f), ROOT / 'avatars' / f'{f.stem.lower()}.webp')
            print(f'avatars/{f.stem.lower()}')
    cmd_check()


def cmd_convert():
    for folder in [ROOT / k for k in list(SPORTS) + ['avatars/women', 'avatars/men']] + [ROOT / 'avatars']:
        files = images(folder) if folder.name == 'avatars' else numbered(folder)
        for f in files:
            if f.suffix.lower() != '.webp':
                (save_avatar if 'avatars' in f.parts else save_photo)(Image.open(f), f.with_suffix('.webp'))
                f.unlink()
    cmd_check()


def cmd_check():
    total = 0
    print(f'\n{ROOT}\n')
    for key, label in SPORTS.items():
        files = numbered(ROOT / key)
        total += sum(f.stat().st_size for f in files)
        want = TARGET.get(key, DEFAULT_TARGET)
        mark = 'ok ' if len(files) >= want else ('мало' if files else 'НЕТ')
        print(f'  [{mark}] {key:16} {label:30} {len(files)}/{want}')
    for g in ('women', 'men'):
        files = numbered(ROOT / 'avatars' / g)
        total += sum(f.stat().st_size for f in files)
        print(f'  [{"ok " if files else "НЕТ"}] avatars/{g:10} портреты массовки {len(files)}')
    missing = [u for u in CAST if not list((ROOT / 'avatars').glob(u + '.*'))]
    print(f'  аватары героев без фото: {", ".join(missing) or "все есть"}')
    print(f'\n  всего {total / 1024 / 1024:.1f} МБ')


if __name__ == '__main__':
    args = sys.argv[1:]
    cmd = args[0] if args else 'check'
    if cmd == 'check':
        cmd_check()
    elif cmd == 'fetch':
        query = args[args.index('--query') + 1] if '--query' in args else None
        rest = [a for a in args[1:] if a != '--query' and a != query]
        keys = [rest[0]] if rest else list(SPORTS)
        for k in keys:
            want = int(rest[1]) if len(rest) > 1 else TARGET.get(k, DEFAULT_TARGET)
            fetch(k, want, [query] if query else QUERIES[k])
    elif cmd == 'sheet' and len(args) == 2:
        sheet(args[1])
    elif cmd == 'drop' and len(args) > 2:
        drop(args[1], args[2:])
    elif cmd == 'import' and len(args) == 2:
        cmd_import(Path(args[1]))
    elif cmd == 'convert':
        cmd_convert()
    else:
        print(__doc__)
        sys.exit(1)
