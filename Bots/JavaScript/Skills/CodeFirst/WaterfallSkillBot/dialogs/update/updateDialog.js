// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const { InputHints, MessageFactory, TurnContext } = require('botbuilder');
const { ChoiceFactory, ChoicePrompt, ComponentDialog, ListStyle, WaterfallDialog, DialogTurnStatus } = require('botbuilder-dialogs');
const { Channels } = require('botbuilder-core');

const WATERFALL_DIALOG = 'WaterfallDialog';
const UPDATE_SUPPORTED = new Set([Channels.Msteams, Channels.Slack, Channels.Telegram]);
const CHOICE_PROMPT = "ChoicePrompt";


class UpdateDialog extends ComponentDialog {
    /**
     * @param {string} dialogId
     */
    constructor(dialogId) {
        super(dialogId);

        this.updateTracker = {};

        this.addDialog(new ChoicePrompt(CHOICE_PROMPT));
        this.addDialog(new WaterfallDialog(WATERFALL_DIALOG, [
                this.HandleUpdateDialog.bind(this),
                this.FinalStepAsync.bind(this)
            ]));

        this.initialDialogId = WATERFALL_DIALOG;
    }

    /**
     * @param {import('botbuilder-dialogs').WaterfallStepContext} stepContext
     */
    async HandleUpdateDialog(stepContext) {
        let channel = stepContext.context.activity.channelId;

        if (UpdateDialog.isUpdateSupported(channel)){
            const conversationId = stepContext.context.activity.conversation.id;

            if (conversationId in this.updateTracker) {
                var tuple = this.updateTracker[conversationId];
                var activity = tuple["activity"];
                activity.text = `This message has been updated ${tuple["count"]} time(s).`;
                tuple["count"]++;
                this.updateTracker[conversationId] = tuple;
                await stepContext.context.updateActivity(activity);
            }
            else
            {
                var activity = MessageFactory.text("Here is the original activity");
                var id = await stepContext.context.sendActivity(activity);
                activity.id = id.id;
                this.updateTracker[conversationId] = {"activity": activity, "count": 1};
            }
        }
        else
        {
            await stepContext.context.sendActivity(MessageFactory.text(`Update is not supported in the ${channel} channel.`))
        }

        const messageText = 'Do you want to update the activity again?';
        const repromptMessageText = 'Please select a valid option';
        const options = {
            prompt: MessageFactory.text(messageText, messageText, InputHints.ExpectingInput),
            retryPrompt: MessageFactory.text(repromptMessageText, repromptMessageText, InputHints.ExpectingInput),
            choices: ChoiceFactory.toChoices(["yes", "no"]),
            style: ListStyle.list
        };

        // Ask the user to enter a card choice.
        return stepContext.prompt(CHOICE_PROMPT, options);
    }

    async FinalStepAsync(stepContext){
        const choice = stepContext.result.value;

        if (choice == "yes"){
            return stepContext.replaceDialog(this.initialDialogId);
        }
        
        this.updateTracker = {};
        return { status: DialogTurnStatus.complete };
    }

    static isUpdateSupported(channel) {
        return UPDATE_SUPPORTED.has(channel);
    }
}

module.exports.UpdateDialog = UpdateDialog