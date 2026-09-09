import { api } from '@/lib/api';
import type { ApiListResponse } from '@/types/api';
import type { Cabin } from '@/types/cabin';

export async function getAllAdminCabins(): Promise<Cabin[]> {
  const cabins: Cabin[] = [];
  let page = 1;
  let lastPage = 1;
  do {
    const response = await api.get<ApiListResponse<Cabin>>(
      `/admin/cabins?trashed=with&per_page=100&page=${page}`,
    );
    cabins.push(...response.data);
    lastPage = response.meta.last_page;
    page += 1;
  } while (page <= lastPage);
  return cabins;
}
