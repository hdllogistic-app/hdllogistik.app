import {
  listTeamMembersService,
  createTeamMemberService,
  updateTeamMemberService,
  createTeamMemberSchema,
  updateTeamMemberSchema,
} from './team-settings.service';

export const createDriverSchema = createTeamMemberSchema;
export const updateDriverSchema = updateTeamMemberSchema;

export async function listDriversService(filters: { search?: string; status?: string }) {
  const result = await listTeamMembersService({
    search: filters.search,
    division: 'DRIVER',
    status: filters.status,
  });

  return {
    success: result.success,
    summary: {
      totalCount: result.summary.driverCount || 0,
      activeCount: result.members.filter((m) => m.division === 'DRIVER' && m.active).length,
      inactiveCount: result.members.filter((m) => m.division === 'DRIVER' && !m.active).length,
    },
    drivers: result.members.filter((m) => m.division === 'DRIVER'),
    error: result.error,
  };
}

export async function createDriverService(rawInput: any, actorUserId: string) {
  const result = await createTeamMemberService({ ...rawInput, division: 'DRIVER' }, actorUserId);
  return {
    success: result.success,
    driver: result.member,
    error: result.error,
  };
}

export async function updateDriverService(id: string, rawInput: any, actorUserId: string) {
  const result = await updateTeamMemberService(id, rawInput, actorUserId);
  return {
    success: result.success,
    driver: result.member,
    error: result.error,
  };
}
