<script lang="ts">
  import PasswordField from "./passwordField.svelte";

  let passwordVisible: boolean = false;
  let repeatedValue: string;

  $: if(value !== repeatedValue){
    error = true;
    //don't overwrite existing error messages if something else already threw an error
    if(!otherError) errorMessage = "'Password' and 'Repeat Password' contents don't match. Please check for typos"
  }

  export let value: string;
  export let error: boolean = false;
  export let otherError: boolean;
  export let errorMessage: string;
  export let tabindex: string = "1";
</script>

<PasswordField bind:value={value} bind:error={error} bind:passwordVisible={passwordVisible} id="password" autocomplete="new-password" tabindex={tabindex}>Password</PasswordField>
<PasswordField bind:value={repeatedValue} bind:error={error} bind:passwordVisible={passwordVisible} id="password-repeat" autocomplete="new-password" tabindex={(+tabindex + 1).toString()}>Repeat Password</PasswordField>
