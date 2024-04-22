function log(...args) {
    console.log("TEST_MODULE --------> ", args)
}

class Enhancements {
    static removeTemplate(activeEffect) {
        let itemId = activeEffect?.flags?.dnd5e?.itemData
        let measuredTemplateDocument = game.canvas.templates.documentCollection.find(x => x.flags.dnd5e.origin.indexOf(itemId) !== -1)
        measuredTemplateDocument?.delete()
    }

    static moveTemplate(token, dx = 50, dy = 50) {
        token.actor.effects.forEach(activeEffect => {
            let itemId = activeEffect.flags.dnd5e.itemData
            let measuredTemplateDocument = game.canvas.templates.documentCollection.find(x => x.flags.dnd5e.origin.indexOf(itemId) !== -1)
            measuredTemplateDocument?.update({x: token.x + dx, y: token.y + dy})
            Enhancements.updateChatMessage(measuredTemplateDocument)
        })
    }

    static displayAffectedTokensDialog(measuredTemplate) {
        let affectedTokens = Enhancements.getAffectedTokensDialog(measuredTemplate)
        let affectedTokensAreaOfEffect = new AffectedTokensAreaOfEffect(affectedTokens)

        if (game.user.name === 'Gamemaster') {
            affectedTokensAreaOfEffect.render(true)
        }
    }

    static getAffectedTokensDialog(measuredTemplate) {
        return game.canvas.tokens.getDocuments()
            .filter(token => measuredTemplate.object.bounds.contains(token.x, token.y))
            .map(token => ({name: token.object.document.name, id: token.id, measuredTemplateId: measuredTemplate.id}))
    }

    static async appendFollowCheckbox(dialog) {
        let form = dialog.querySelector("#ability-use-form")

        if (form) {
            let content = await renderTemplate('./modules/test-module-FoundryVTT/templates/test.hbs', {data: {checked: false}})
            log(content)
            form.innerHTML += content
            dialog.style.height = 'auto'
        }
    }

    static async updateChatMessage(measuredTemplateDocument) {
        if (!measuredTemplateDocument) {
            return
        }

        let itemUuid = measuredTemplateDocument.flags.dnd5e.origin
        let messageChats = game.messages.filter(x => x.flags.dnd5e.use.itemUuid === itemUuid)
        let messageChat = messageChats[messageChats.length - 1]
        let affectedTokens = Enhancements.getAffectedTokensDialog(measuredTemplateDocument)
        let content = await renderTemplate('./modules/test-module-FoundryVTT/templates/affected-tokens-area-of-effect.hbs', {data: affectedTokens})

        let EMPTY_TOKEN = '<div id="EMPTY_TOKEN"> </div>'

        let messageContent = messageChat.content.split('<div id="EMPTY_TOKEN"> </div>')[0]
        log(messageContent)

        messageChat.update({
            content: messageContent + EMPTY_TOKEN + content,
            speaker: {
                ...messageChat.speaker,
                measuredTemplateDocument: measuredTemplateDocument.id
            }
        })
    }
}

class AffectedTokensAreaOfEffect extends FormApplication {
    _data = []

    constructor(data) {
        super(data)
        this._data = data
    }

    static get defaultOptions() {
        const defaults = super.defaultOptions

        const overrides = {
            height: 'auto',
            width: 400,
            id: 'names',
            template: "./modules/test-module-FoundryVTT/templates/affected-tokens-area-of-effect.hbs",
            title: 'Affected Tokens by Area Of Effect',
            userId: game.userId,
            classes: ["my-custom-class"]
        }

        return foundry.utils.mergeObject(defaults, overrides)
    }

    getData(options) {
        return {
            data: this._data
        }
    }
}

class RegisterHooks {
    static init() {
        Hooks.once('init', async function () {
            log('init')
            CONFIG.debug.hooks = true
        })

        Hooks.on('dnd5e.endConcentration', async function (actor5e, activeEffect) {
            log('dnd5e.endConcentration', activeEffect)
            Enhancements.removeTemplate(activeEffect)
        })

        Hooks.on('createMeasuredTemplate', async function (measuredTemplateDocument, flags, id) {
            log('createMeasuredTemplate', measuredTemplateDocument)
            Enhancements.updateChatMessage(measuredTemplateDocument)
        })

        Hooks.on('updateToken', (token, diff, flags, user) => {
            log('updateToken', token)
            Enhancements.moveTemplate(token)
        })

        Hooks.on('dnd5e.useItem', async function (item, spellSlot, configDialog, measuredTemplateDocuments, effects) {
            let measuredTemplateDocument = measuredTemplateDocuments && measuredTemplateDocuments[0]
            log('dnd5e.useItem', measuredTemplateDocument)
            Enhancements.displayAffectedTokensDialog(measuredTemplateDocument)
        })

        Hooks.on('renderAbilityUseDialog', async function (abilityUseDialog, htmls, content) {
            let html = htmls && htmls[0]
            log('renderAbilityUseDialog', html)
            Enhancements.appendFollowCheckbox(html)
        })

        Hooks.on('updateMeasuredTemplate', async function (measuredTemplateDocument, flags, data, user) {
            log('updateMeasuredTemplate', measuredTemplateDocument)
            Enhancements.displayAffectedTokensDialog(measuredTemplateDocument)
        })
    }
}

RegisterHooks.init()