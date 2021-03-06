import * as Completions from "@src/completions"
import * as Metadata from "@src/.metadata.generated"
import * as config from "@src/lib/config"
import * as aliases from "@src/lib/aliases"

class ExcmdCompletionOption extends Completions.CompletionOptionHTML
    implements Completions.CompletionOptionFuse {
    public fuseKeys = []
    constructor(public value: string, public documentation: string = "") {
        super()
        this.fuseKeys.push(this.value)

        // Create HTMLElement
        this.html = html`<tr class="ExcmdCompletionOption option">
                <td class="excmd">${value}</td>
                <td class="documentation">${documentation}</td>
            </tr>`
    }
}

export class ExcmdCompletionSource extends Completions.CompletionSourceFuse {
    public options: ExcmdCompletionOption[]

    constructor(private _parent) {
        super([], "ExcmdCompletionSource", "ex commands")

        this.updateOptions()
        this._parent.appendChild(this.node)
    }

    async filter(exstr) {
        this.lastExstr = exstr
        return this.onInput(exstr)
    }

    async onInput(exstr) {
        return this.updateOptions(exstr)
    }

    updateChain(exstr = this.lastExstr, options = this.options) {
        if (this.options.length > 0) this.state = "normal"
        else this.state = "hidden"

        this.updateDisplay()
    }

    select(option: ExcmdCompletionOption) {
        this.completion = option.value
        option.state = "focused"
        this.lastFocused = option
    }

    setStateFromScore(scoredOpts: Completions.ScoredOption[]) {
        super.setStateFromScore(scoredOpts, false)
    }

    private async updateOptions(exstr = "") {
        this.lastExstr = exstr

        const excmds = Metadata.everything.getFile("src/excmds.ts")
        if (!excmds) return
        const fns = excmds.getFunctions()

        // Add all excmds that start with exstr and that tridactyl has metadata about to completions
        this.options = this.scoreOptions(
            fns
                .filter(([name, fn]) => !fn.hidden && name.startsWith(exstr))
                .map(([name, fn]) => new ExcmdCompletionOption(name, fn.doc)),
        )

        // Also add aliases to possible completions
        const exaliases = Object.keys(config.get("exaliases")).filter(a =>
            a.startsWith(exstr),
        )
        for (const alias of exaliases) {
            const cmd = aliases.expandExstr(alias)
            const fn = excmds.getFunction(cmd)
            if (fn) {
                this.options.push(
                    new ExcmdCompletionOption(
                        alias,
                        `Alias for \`${cmd}\`. ${fn.doc}`,
                    ),
                )
            } else {
                // This can happen when the alias is a composite command or a command with arguments. We can't display doc because we don't know what parameter the alias takes or what it does.
                this.options.push(
                    new ExcmdCompletionOption(alias, `Alias for \`${cmd}\`.`),
                )
            }
        }

        this.options.forEach(o => (o.state = "normal"))
        return this.updateChain()
    }

    private scoreOptions(options: ExcmdCompletionOption[]) {
        return options.sort((o1, o2) => o1.value.localeCompare(o2.value))

        // Too slow with large profiles
        // let histpos = state.cmdHistory.map(s => s.split(" ")[0]).reverse()
        // return exstrs.sort((a, b) => {
        //     let posa = histpos.findIndex(x => x == a)
        //     let posb = histpos.findIndex(x => x == b)
        //     // If two ex commands have the same position, sort lexically
        //     if (posa == posb) return a < b ? -1 : 1
        //     // If they aren't found in the list they get lower priority
        //     if (posa == -1) return 1
        //     if (posb == -1) return -1
        //     // Finally, sort by history position
        //     return posa < posb ? -1 : 1
        // })
    }
}
