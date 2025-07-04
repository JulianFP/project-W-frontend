<script lang="ts">
import { invalidate } from "$app/navigation";
import {
	Heading,
	Helper,
	Input,
	Label,
	Modal,
	P,
	Table,
	TableBody,
	TableBodyCell,
	TableBodyRow,
	TableHead,
	TableHeadCell,
} from "flowbite-svelte";
import {
	ClipboardOutline,
	PlusOutline,
	TrashBinSolid,
} from "flowbite-svelte-icons";

import Button from "$lib/components/button.svelte";
import CenterPage from "$lib/components/centerPage.svelte";
import ConfirmModal from "$lib/components/confirmModal.svelte";
import ConfirmPasswordModal from "$lib/components/confirmPasswordModal.svelte";
import PasswordWithRepeatField from "$lib/components/passwordWithRepeatField.svelte";
import WaitingSubmitButton from "$lib/components/waitingSubmitButton.svelte";
import { alerts, auth } from "$lib/utils/global_state.svelte";
import {
	BackendCommError,
	deletLoggedIn,
	postLoggedIn,
} from "$lib/utils/httpRequests.svelte";
import type { components } from "$lib/utils/schema";
import { error } from "@sveltejs/kit";

type Data = {
	user_info: components["schemas"]["User"];
	token_info: components["schemas"]["TokenSecretInfo"][];
	auth_settings: components["schemas"]["AuthSettings"];
};
interface Props {
	data: Data;
}
let { data }: Props = $props();

let table_items: { id: number; name: string }[] = $derived.by(() => {
	let items = [];
	for (let item of data.token_info) {
		if (!item.temp_token_secret) {
			items.push({ id: item.id, name: item.name ? item.name : "" });
		}
	}
	return items;
});
let temp_token_secret_id: number = $derived.by(() => {
	for (let item of data.token_info) {
		if (item.temp_token_secret) return item.id;
	}
	error(
		400,
		"There is no info about the temporary token secret among the token infos the backend returned",
	);
});
let api_token_creation_allowed: boolean = $derived.by(() => {
	if (
		data.user_info.user_type === "local" &&
		data.auth_settings.local_account.allow_creation_of_api_tokens
	)
		return true;
	if (data.user_info.user_type === "oidc") {
		for (const [prov_name, prov_sett] of Object.entries(
			data.auth_settings.oidc_providers,
		)) {
			if (
				data.user_info.provider_name === prov_name &&
				prov_sett.allow_creation_of_api_tokens
			)
				return true;
		}
	} else {
		for (const [prov_name, prov_sett] of Object.entries(
			data.auth_settings.ldap_providers,
		)) {
			if (
				data.user_info.provider_name === prov_name &&
				prov_sett.allow_creation_of_api_tokens
			)
				return true;
		}
	}
	return false;
});

let password: string = $state("");
let newPassword: string = $state("");
let changePasswordError: boolean = $state(false);
let changePasswordErrorMsg: string = $state("");
let passwordModalOpen = $state(false);

let tokenName = $state("");
let waitingForToken = $state(false);
let createAPITokenModalOpen = $state(false);
let createdAPIToken = $state("");
let createAPITokenError = $state(false);
let createAPITokenErrorMsg = $state("");
let invalidError = $state(false);
let invalidErrorMsg: string = $state("");
let invalidModalOpen = $state(false);
let invalidateTokenId: number = $state(0);
let invalidAPIModalOpen = $state(false);
let invalidSessionModalOpen = $state(false);

function openChangePasswordModal(event: Event) {
	event.preventDefault();
	passwordModalOpen = true;
}

function openInvalidateAPITokenModal(id: number) {
	invalidateTokenId = id;
	invalidAPIModalOpen = true;
}

async function changePassword(): Promise<void> {
	const response = await postLoggedIn<string>(
		"local-account/change_user_password",
		{
			password: password,
			new_password: newPassword,
		},
	);
	alerts.push({ msg: response, color: "green" });
	newPassword = "";
}

async function createAPIToken(event: Event): Promise<void> {
	event.preventDefault();

	waitingForToken = true;
	createAPITokenError = false;
	try {
		createdAPIToken = await postLoggedIn<string>(
			"users/get_new_api_token",
			{},
			false,
			{ name: tokenName },
		);
		createAPITokenModalOpen = true;
		tokenName = "";
	} catch (err: unknown) {
		if (err instanceof BackendCommError) {
			createAPITokenErrorMsg = err.message;
		} else {
			createAPITokenErrorMsg = "Unknown error";
		}
		createAPITokenError = true;
	}
	invalidate("app:token_info");
	waitingForToken = false;
}

async function invalidateToken(id: number): Promise<void> {
	try {
		await deletLoggedIn<null>(
			"users/invalidate_token",
			{},
			{ token_id: id.toString() },
		);
		alerts.push({
			msg: `Successfully invalidated token with id ${id}`,
			color: "green",
		});
	} catch (err: unknown) {
		let errorMsg = "Error occured while trying to invalidate api token: ";
		if (err instanceof BackendCommError) {
			errorMsg += err.message;
		} else {
			errorMsg += "Unknown error";
		}
		alerts.push({ msg: errorMsg, color: "red" });
	}
}

async function invalidateAllTokens(): Promise<void> {
	try {
		await deletLoggedIn<null>("users/invalidate_all_tokens");
		alerts.push({
			msg: "All tokens succuessfully invalidated",
			color: "green",
		});
		if (data.user_info.user_type !== "oidc") {
			auth.forgetToken();
		} else {
			invalidate("app:token_info");
		}
	} catch (err: unknown) {
		if (err instanceof BackendCommError) {
			invalidErrorMsg = err.message;
		} else {
			invalidErrorMsg = "Unknown error";
		}
		invalidError = true;
	}
}
</script>

<CenterPage title="Account security">
  {#if data.user_info.user_type === "local"}
    <form onsubmit={openChangePasswordModal}>
      <Heading tag="h3" class="mb-4">Change Password</Heading>
      <PasswordWithRepeatField bind:value={newPassword} bind:error={changePasswordError} bind:errorMsg={changePasswordErrorMsg} password_change={true}/>

      {#if changePasswordError}
        <Helper class="mt-2" color="red">{changePasswordErrorMsg}</Helper>
      {/if}

      <div class="my-2">
        <Button type="submit" tabindex={3}>Change Password</Button>
      </div>
    </form>
  {/if}

  <div class="flex flex-col gap-4">
    {#if api_token_creation_allowed || data.user_info.user_type !== "oidc"}
      <Heading tag="h3">Sessions and API tokens</Heading>
    {:else}
      <P>There are no security settings available for this account</P>
    {/if}
    {#if api_token_creation_allowed}
      <form onsubmit={createAPIToken} class="flex items-end gap-2 w-full">
        <div class="w-full">
          <Label for="new_api-token_name" color={createAPITokenError ? "red" : "gray"} class="mb-2">Name of the new API token</Label>
          <Input id="new_api-token_name" name="new api token name" type="text" color={createAPITokenError ? "red" : "default"} maxlength={64} placeholder="token's name" bind:value={tokenName} required/>
        </div>
        <div>
          <WaitingSubmitButton class="w-max" pill waiting={waitingForToken}><PlusOutline class="mr-2"/>Create API Token</WaitingSubmitButton>
        </div>
      </form>
      {#if createAPITokenError}
        <Helper class="mt-2" color="red"><span class="font-medium">Login failed!</span> {createAPITokenErrorMsg}</Helper>
      {/if}

      <Table shadow>
        <TableHead>
          <TableHeadCell>ID</TableHeadCell>
          <TableHeadCell>Name</TableHeadCell>
          <TableHeadCell></TableHeadCell>
        </TableHead>
        <TableBody>
          {#if table_items.length === 0}
            <TableBodyRow>
              <TableBodyCell colspan={3}><P>You don't have any API tokens yet. You can create API tokens for for your custom clients/scripts/automations by clicking on the 'Create API Token' button. API tokens will never expire unless you invalidate them manually.</P></TableBodyCell>
            </TableBodyRow>
          {/if}
          {#each table_items as item}
            <TableBodyRow>
              <TableBodyCell>{item.id}</TableBodyCell>
              <TableBodyCell class="w-full">{item.name}</TableBodyCell>
              <TableBodyCell>
                <Button pill outline class="!p-2" size="xs" color="red" onclick={() => {openInvalidateAPITokenModal(item.id)}}>
                  <TrashBinSolid class="mr-2"/>Invalidate
                </Button>
              </TableBodyCell>
            </TableBodyRow>
          {/each}
        </TableBody>
      </Table>
    {/if}
    <div>
      {#if data.user_info.user_type !== "oidc"}
        <Button outline color="red" class="w-full" onclick={() => invalidSessionModalOpen = true} tabindex={4}>Invalidate all sessions</Button>
      {/if}
      {#if api_token_creation_allowed}
        <Button outline color="red" class="w-full mt-2" onclick={() => invalidModalOpen = true} tabindex={5}>{data.user_info.user_type !== "oidc" ? "Invalidate all sessions and API tokens" : "Invalidate all API tokens"}</Button>
        {#if invalidError}
          <Helper class="mt-2" color="red">{invalidErrorMsg}</Helper>
        {/if}
      {/if}
    </div>
  </div>
</CenterPage>

<ConfirmPasswordModal bind:open={passwordModalOpen} bind:value={password} action={changePassword} onerror={(err: BackendCommError) => {changePasswordErrorMsg = err.message; changePasswordError = true;}}>
  You are about to change this accounts password. You have to remember your new password in order to login in the future.
</ConfirmPasswordModal>

<ConfirmModal bind:open={invalidAPIModalOpen} action={async () => {await invalidateToken(invalidateTokenId); invalidate("app:token_info");}}>
  The API token with ID {invalidateTokenId} will be invalidated. This will log out the device using that token. Are you sure?
</ConfirmModal>

<ConfirmModal bind:open={invalidSessionModalOpen} action={async () => {await invalidateToken(temp_token_secret_id); auth.forgetToken();}}>
  We will invalidate all your session tokens thus logging you out from all your temporary devices (e.g. browsers, including this one). API tokens will stay valid. You will have to login again.
</ConfirmModal>

<ConfirmModal bind:open={invalidModalOpen} action={invalidateAllTokens}>
  {data.user_info.user_type !== "oidc" ? "We will invalidate all your session and API tokens thus logging you out from both all your temporary devices (e.g. browsers, including this one) and devices using API tokens. You will have to login again." : "We will invalidate all your API tokens thus logging you out from all devices using API tokens."}
</ConfirmModal>

<Modal bind:open={createAPITokenModalOpen} autoclose={false} onclose={() => createdAPIToken = ""}>
  Your newly created API token is:
  <P space="tighter" class="break-all" italic>{createdAPIToken}</P>
  <div class="flex items-end gap-2 w-full">
    <Button color="alternative" onclick={() => navigator.clipboard.writeText(createdAPIToken)}>
      <ClipboardOutline class="mr-2"/>Copy token to clipboard
    </Button>
    <Button onclick={() => {createAPITokenModalOpen = false; createdAPIToken = "";}}>
      Close
    </Button>
  </div>
</Modal>
