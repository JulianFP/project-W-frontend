<script lang="ts">
import { Button } from "flowbite-svelte";
import type { ButtonProps } from "flowbite-svelte";

const props: ButtonProps = $props();
const { class: string, disabled, ...rest } = props;
let classes = $derived.by(() => {
	let returnVal: string;
	if (props.color === "alternative") {
		returnVal = `${props.class} dark:text-white border-gray-400 dark:border-gray-700 bg-gray-100 dark:bg-gray-700 hover:bg-gray-300 hover:dark:bg-gray-500 hover:dark:border-gray-500`;
	} else {
		returnVal = `${props.class}`;
	}
	if (disabled) {
		returnVal += " cursor-not-allowed";
	} else {
		returnVal += " cursor-pointer";
	}
	return returnVal;
});
</script>
<Button class={classes} disabled={props.disabled} {...rest}/>
