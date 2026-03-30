/**
 * Barrel import that registers all built-in kfindDriver instances.
 *
 * Each imported file calls `registry.add("kfindDriver", ...)` as a
 * top-level side effect, so simply importing this file is sufficient
 * to register all drivers.
 *
 * This file is imported from `init.ts` BEFORE the app callback fires,
 * ensuring all built-in drivers are available when the search modal
 * first mounts.
 *
 * Third-party Jahia modules can register additional drivers in their
 * own init callbacks — they don't need to modify this file.
 */
import './features/register.ts';
import './urlReverseLookup/register.ts';
import './augmented/register.ts';
import './jcr/media/register.ts';
import './jcr/pages/register.ts';
import './jcr/mainResources/register.ts';
