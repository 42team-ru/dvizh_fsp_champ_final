import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import type { AlbumPhotoResponse, UsersAlbumSort } from "@/shared/api/generated/core/appAPI.schemas";
import {
  getUsersAlbumFoldersQueryKey,
  getUsersAlbumQueryKey,
  getUsersGetQueryKey,
  getUsersMyPhotosQueryKey,
  usersAlbum,
  useUsersAlbumFolders,
} from "@/shared/api/generated/core/users/users";

const PAGE_SIZE = 20;

/** Папки альбома и итоги для шапки: сколько фото и папок, какие виды спорта встречаются. */
export function useAlbumFolders(userId: string) {
  const query = useUsersAlbumFolders(userId, { query: { retry: false } });
  const folders = query.data?.status === 200 ? query.data.data : [];
  const total = folders.reduce((sum, f) => sum + f.photoCount, 0);
  const sports = [...new Map(folders.map((f) => [f.event.sport.id, f.event.sport])).values()];
  return { query, folders, total, sports };
}

/** Фото альбома страницами по 20: «Показать ещё» догружает следующую. */
export function useAlbumPhotos(
  userId: string,
  filter: { eventId?: string; sportId?: string; sort: UsersAlbumSort },
) {
  const params = { ...filter, size: PAGE_SIZE };
  const query = useInfiniteQuery({
    queryKey: [...getUsersAlbumQueryKey(userId, params), "infinite"],
    initialPageParam: 0,
    queryFn: ({ pageParam, signal }) => usersAlbum(userId, { ...params, page: pageParam }, { signal }),
    getNextPageParam: (last) =>
      last.status === 200 && (last.data.page ?? 0) + 1 < (last.data.totalPages ?? 0) ? (last.data.page ?? 0) + 1 : undefined,
    retry: false,
  });
  const photos: AlbumPhotoResponse[] =
    query.data?.pages.flatMap((p) => (p.status === 200 ? (p.data.items ?? []) : [])) ?? [];
  const first = query.data?.pages[0];
  const total = first?.status === 200 ? (first.data.totalElements ?? 0) : 0;
  return { query, photos, total };
}

/** После загрузки, подписи или удаления: альбом, папки и публичный профиль перечитываются. */
export function useRefreshGallery(userId: string) {
  const cache = useQueryClient();
  return () =>
    Promise.all([
      cache.invalidateQueries({ queryKey: [getUsersAlbumQueryKey(userId)[0]] }),
      cache.invalidateQueries({ queryKey: getUsersAlbumFoldersQueryKey(userId) }),
      cache.invalidateQueries({ queryKey: getUsersMyPhotosQueryKey() }),
      cache.invalidateQueries({ queryKey: getUsersGetQueryKey(userId) }),
    ]);
}
