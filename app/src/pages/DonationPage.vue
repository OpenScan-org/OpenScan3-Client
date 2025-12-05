<template>
  <BasePage>
    <TextCard title="Support OpenScan">
          <template #default>
            <p>
              Hey, this is Thomas, the guy behind OpenScan :)
            </p>
            <p>
              I am glad you made it here! I am very happy to be able to share OpenScan with the world. A lot of
              passion, but also many hours already went into this project and to be honest, I've never expected to
              get so far.
            </p>
            <p>
              Anyway, there is so much more that I would like to do. It is not only about keeping everything
              open-source and maintained, there are just so many cool new features and ideas that need to be tried
              out :)
            </p>
            <p>
              <strong>
                Buying me a coffee once or monthly would not only help me stay awake all night programming, but
                would also be a great motivation for all further developments.
              </strong>
            </p>
            <p>
              Thank you very much for your support,
            </p>
            <p>
              best greetings from Halle, Germany,
            </p>
            <p>
              Thomas
            </p>
          </template>
          <template #links>
            <BaseLink
              label="Get in touch"
              icon="email"
              href="mailto:info@openscan.eu?subject=Support OpenScan"
            />
            <BaseLink
              label="Become a Patreon"
              icon="volunteer_activism"
              href="https://www.patreon.com/OpenScan"
            />
            <BaseLink
              label="Buy me a coffee"
              icon="coffee"
              href="https://buymeacoffee.com/openscan"
            />
          </template>
        </TextCard>
    </BasePage>
</template>

<script setup lang="ts">
import TextCard from 'components/common/TextCard.vue'
import BaseLink from 'components/base/BaseLink.vue'
import BasePage from 'components/base/BasePage.vue'
</script>

<style scoped>
</style>
