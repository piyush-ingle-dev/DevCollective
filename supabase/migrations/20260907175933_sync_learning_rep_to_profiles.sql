create or replace function public.complete_learning_submodule(p_user_id text, p_submodule_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_submodule public.learning_submodules%rowtype;
  v_module public.learning_modules%rowtype;
  v_level public.learning_levels%rowtype;
  v_new_submodule boolean := false;
  v_module_count integer;
  v_verified_count integer;
  v_module_completed boolean := false;
  v_level_total integer;
  v_level_verified integer;
  v_level_completed boolean := false;
  v_rep_awarded integer := 0;
  v_new_rep integer := 0;
begin
  if p_user_id is null or length(trim(p_user_id)) = 0 then raise exception 'user_id is required'; end if;
  select * into v_submodule from public.learning_submodules where id = p_submodule_id;
  if not found then raise exception 'Unknown learning submodule'; end if;
  select * into v_module from public.learning_modules where id = v_submodule.module_id;
  select * into v_level from public.learning_levels where id = v_module.level_id;

  insert into public.user_submodule_progress(user_id, submodule_id) values (p_user_id, p_submodule_id) on conflict (user_id, submodule_id) do nothing;
  v_new_submodule := found;

  select count(*) into v_module_count from public.learning_submodules where module_id = v_module.id;
  select count(*) into v_verified_count from public.user_submodule_progress usp join public.learning_submodules ls on ls.id = usp.submodule_id where usp.user_id = p_user_id and ls.module_id = v_module.id;
  v_module_completed := v_verified_count = v_module_count;
  insert into public.user_module_progress(user_id,module_id,verified_submodule_count,completed_at,updated_at) values (p_user_id,v_module.id,v_verified_count,case when v_module_completed then now() else null end,now()) on conflict (user_id,module_id) do update set verified_submodule_count=excluded.verified_submodule_count, completed_at=case when public.user_module_progress.completed_at is not null then public.user_module_progress.completed_at else excluded.completed_at end, updated_at=now();

  if v_new_submodule then
    insert into public.learning_rep_ledger(user_id,amount,reason,source,source_id) values (p_user_id,v_submodule.rep_reward,'Completed Level 0 submodule','learning_submodule',p_submodule_id) on conflict (user_id,source,source_id) do nothing;
    if found then v_rep_awarded := v_rep_awarded + v_submodule.rep_reward; end if;
  end if;
  if v_module_completed and not exists (select 1 from public.learning_rep_ledger where user_id=p_user_id and source='learning_module' and source_id=v_module.id) then
    insert into public.learning_rep_ledger(user_id,amount,reason,source,source_id) values (p_user_id,v_module.rep_reward,'Completed Level 0 module','learning_module',v_module.id);
    v_rep_awarded := v_rep_awarded + v_module.rep_reward;
  end if;

  if v_rep_awarded > 0 then
    update public.devcollective_profiles set rep=coalesce(rep,0)+v_rep_awarded, level=greatest(1,floor((coalesce(rep,0)+v_rep_awarded)/150)::integer+1) where clerk_user_id=p_user_id;
  end if;
  select rep into v_new_rep from public.devcollective_profiles where clerk_user_id=p_user_id;

  select count(*) into v_level_total from public.learning_submodules ls join public.learning_modules lm on lm.id=ls.module_id where lm.level_id=v_level.id;
  select count(*) into v_level_verified from public.user_submodule_progress usp join public.learning_submodules ls on ls.id=usp.submodule_id join public.learning_modules lm on lm.id=ls.module_id where usp.user_id=p_user_id and lm.level_id=v_level.id;
  v_level_completed := v_level_verified = v_level_total;
  insert into public.user_level_progress(user_id,level_id,verified_submodule_count,total_submodule_count,completed_at,updated_at) values(p_user_id,v_level.id,v_level_verified,v_level_total,case when v_level_completed then now() else null end,now()) on conflict(user_id,level_id) do update set verified_submodule_count=excluded.verified_submodule_count,total_submodule_count=excluded.total_submodule_count,completed_at=case when public.user_level_progress.completed_at is not null then public.user_level_progress.completed_at else excluded.completed_at end,updated_at=now();

  return jsonb_build_object('levelId',v_level.id,'moduleId',v_module.id,'submoduleId',v_submodule.id,'newlyVerified',v_new_submodule,'moduleCompleted',v_module_completed,'levelCompleted',v_level_completed,'verifiedSubmoduleCount',v_level_verified,'totalSubmoduleCount',v_level_total,'repAwarded',v_rep_awarded,'newRep',coalesce(v_new_rep,0));
end;
$$;

update public.devcollective_profiles p set rep=coalesce(p.rep,0)+coalesce(x.learning_rep,0), level=greatest(1,floor((coalesce(p.rep,0)+coalesce(x.learning_rep,0))/150)::integer+1) from (select user_id,sum(amount)::integer as learning_rep from public.learning_rep_ledger group by user_id) x where p.clerk_user_id=x.user_id and coalesce(x.learning_rep,0)<>0;
